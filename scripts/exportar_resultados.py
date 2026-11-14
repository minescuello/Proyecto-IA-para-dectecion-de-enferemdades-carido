"""
Puente Python -> React.
Toma lo que genera proyecto_ia_brfss.py (carpeta resultados/) y el mismo CSV de datos,
y escribe los tres JSON que lee la app: modelo.json, metricas.json y variables.json.

Uso (en la carpeta donde corriste proyecto_ia_brfss.py):
    python exportar_resultados.py --out ../cardioia-react/src/data
"""
import argparse, ast, json, os, shutil
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

SEMILLA = 42
ARCHIVO = "heart_disease_health_indicators_BRFSS2015.csv"
URL = ("https://raw.githubusercontent.com/doguilmak/Heart-Diseaseor-Attack-Classification/main/" + ARCHIVO)
BIN = ["HighBP", "HighChol", "CholCheck", "Smoker", "Stroke", "PhysActivity", "Fruits", "Veggies",
       "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost", "DiffWalk", "Sex", "obesidad", "sobrepeso",
       "mala_salud_general", "hipertension_y_colesterol", "adulto_mayor_65", "ingreso_bajo", "barrera_acceso_salud"]
NUM = ["BMI", "MentHlth", "PhysHlth", "GenHlth", "Age", "Education", "Income", "Diabetes",
       "dias_mal_salud_total", "factores_riesgo_total", "habitos_alimentarios"]
NOMBRES = {"Baseline (Reg. Logistica por defecto)": "Baseline", "Regresion Logistica": "Reg. logística",
           "Arbol de Decision": "Árbol de decisión", "Random Forest": "Random Forest",
           "Gradient Boosting": "Gradient Boosting"}


def cargar():
    df = pd.read_csv(ARCHIVO if os.path.exists(ARCHIVO) else URL).drop_duplicates().reset_index(drop=True)
    df["objetivo"] = df["HeartDiseaseorAttack"].astype(int)
    df["obesidad"] = (df["BMI"] >= 30).astype(int)
    df["sobrepeso"] = ((df["BMI"] >= 25) & (df["BMI"] < 30)).astype(int)
    df["dias_mal_salud_total"] = df["MentHlth"] + df["PhysHlth"]
    df["mala_salud_general"] = (df["GenHlth"] >= 4).astype(int)
    df["hipertension_y_colesterol"] = (df["HighBP"] * df["HighChol"]).astype(int)
    df["factores_riesgo_total"] = (df["HighBP"] + df["HighChol"] + df["Smoker"] + (df["Diabetes"] == 2).astype(int)
                                   + df["obesidad"] + (df["PhysActivity"] == 0).astype(int))
    df["adulto_mayor_65"] = (df["Age"] >= 10).astype(int)
    df["habitos_alimentarios"] = df["Fruits"] + df["Veggies"]
    df["ingreso_bajo"] = (df["Income"] <= 4).astype(int)
    df["barrera_acceso_salud"] = ((df["AnyHealthcare"] == 0) | (df["NoDocbcCost"] == 1)).astype(int)
    return df


def mejor_c(carpeta):
    """Lee el C elegido por GridSearchCV en log_hiperparametros.csv (si no existe, C=1)."""
    ruta = os.path.join(carpeta, "log_hiperparametros.csv")
    if not os.path.exists(ruta):
        return 1.0
    log = pd.read_csv(ruta)
    fila = log[(log["modelo"] == "Regresion Logistica") & (log["es_el_mejor"])].iloc[0]
    return float(ast.literal_eval(fila["parametros"])["C"])


def guardar(ruta, obj):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    print("escrito:", ruta)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--resultados", default="resultados")
    ap.add_argument("--out", default="src/data")
    ap.add_argument("--public", default=None, help="carpeta public/resultados de la app (por defecto, junto a --out)")
    a = ap.parse_args()
    requeridos = [os.path.abspath(os.path.join(a.resultados, n))
                  for n in ("metricas_test.csv", "variables_utilizadas.csv")]
    faltantes = [ruta for ruta in requeridos if not os.path.isfile(ruta)]
    if faltantes:
        ap.error("Faltan archivos del entrenamiento externo: " + ", ".join(faltantes)
                 + ". Para generar gráficas dentro de CardioIA, usa Centro de IA > Entrenar ahora.")
    os.makedirs(a.out, exist_ok=True)

    df = cargar()
    X, y = df[BIN + NUM], df["objetivo"]
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=0.20, stratify=y, random_state=SEMILLA)
    X_train, _, y_train, _ = train_test_split(X_temp, y_temp, test_size=0.25, stratify=y_temp, random_state=SEMILLA)

    # 1) Modelo para el predictor: regresión logística balanceada + escalado aprendido solo con train
    esc = StandardScaler().fit(X_train[NUM])
    clf = LogisticRegression(max_iter=1000, class_weight="balanced", C=mejor_c(a.resultados))
    clf.fit(np.hstack([esc.transform(X_train[NUM]), X_train[BIN].values]), y_train)
    coef = clf.coef_[0]
    guardar(os.path.join(a.out, "modelo.json"), {
        "num": NUM, "mu": esc.mean_.round(5).tolist(), "sd": esc.scale_.round(5).tolist(),
        "w": coef[:len(NUM)].round(5).tolist(), "bin": BIN, "wb": coef[len(NUM):].round(5).tolist(),
        "b": round(float(clf.intercept_[0]), 5), "P": round(float(y_train.mean()), 5)})

    # 2) Métricas del conjunto de test
    t = pd.read_csv(os.path.join(a.resultados, "metricas_test.csv"), index_col=0)
    modelos = [{"nombre": NOMBRES.get(n, n), **{k: float(v) for k, v in fila.items()}} for n, fila in t.iterrows()]
    guardar(os.path.join(a.out, "metricas.json"), {
        "n": int(len(df)), "nTest": int(len(y_test)), "prevalencia": round(float(y.mean()), 5), "modelos": modelos})

    # 3) Catálogo de variables
    v = pd.read_csv(os.path.join(a.resultados, "variables_utilizadas.csv"))
    guardar(os.path.join(a.out, "variables.json"), [
        [r.variable, "b" if r.tipo == "binaria" else "n", "d" if r.origen == "derivada" else "o", r.descripcion]
        for r in v.itertuples()])

    # 4) Gráficas PNG de proyecto_ia_brfss.py -> public/resultados (la app las muestra en una galería)
    destino = a.public or os.path.join(a.out, "..", "..", "public", "resultados")
    os.makedirs(destino, exist_ok=True)
    for png in sorted(os.listdir(a.resultados)):
        if png.lower().endswith(".png"):
            shutil.copy(os.path.join(a.resultados, png), destino)
            print("copiada:", png)


if __name__ == "__main__":
    main()
