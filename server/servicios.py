"""Lógica de negocio: base BRFSS, importación, limpieza, estadística descriptiva y re-entrenamiento."""
import io
import json
import os
import threading
import time
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from . import db, graficas
from .esquema import BIN, BIN_ORIG, NUM, NUM_ORIG, OBJ, ORIG, RANGOS, derivar

warnings.filterwarnings("ignore")
COLS = ORIG + [OBJ]
TUNE_N = 20000
ARCHIVO = "heart_disease_health_indicators_BRFSS2015.csv"
URL = "https://raw.githubusercontent.com/doguilmak/Heart-Diseaseor-Attack-Classification/main/" + ARCHIVO
ahora = lambda: datetime.now().isoformat(timespec="seconds")


def _r(v, d=3):
    return None if v is None or pd.isna(v) else round(float(v), d)


# ------------------------------------------------------------------ base BRFSS
BASE = {"estado": "inactivo", "mensaje": ""}


def sembrar_base(forzar=False):
    with db.conexion() as c:
        n = c.execute("SELECT COUNT(*) FROM patrones WHERE origen='brfss'").fetchone()[0]
    if n and not forzar:
        BASE.update(estado="listo", mensaje=f"{n:,} patrones de la base BRFSS")
        return
    BASE.update(estado="cargando", mensaje="Leyendo el dataset BRFSS 2015…")
    try:
        fuente = next((p for p in (ARCHIVO, os.path.join("..", ARCHIVO)) if os.path.exists(p)), URL)
        df = pd.read_csv(fuente).drop_duplicates().rename(columns={"HeartDiseaseorAttack": OBJ})[COLS]
        if forzar:
            with db.conexion() as c:
                c.execute("DELETE FROM patrones WHERE origen='brfss'")
        db.insertar_df(df, "brfss")
        BASE.update(estado="listo", mensaje=f"{len(df):,} patrones de la base BRFSS")
    except Exception as e:  # sin internet, archivo ausente, etc.
        BASE.update(estado="error", mensaje=f"No se pudo cargar la base: {str(e)[:160]}")


# ------------------------------------------------------------------ importación y registro
TOK = {"si": 1, "sí": 1, "yes": 1, "true": 1, "verdadero": 1, "hombre": 1, "male": 1, "masculino": 1,
       "no": 0, "false": 0, "falso": 0, "mujer": 0, "female": 0, "femenino": 0}
ALIAS = {"HeartDiseaseorAttack": OBJ, "target": OBJ, "enfermedad_cardiaca": OBJ, "enfermedad": OBJ}


def mask_fuera(df):
    m = pd.DataFrame(False, index=df.index, columns=COLS)
    for c, (lo, hi) in RANGOS.items():
        m[c] = ((df[c] < lo) | (df[c] > hi)) & df[c].notna()
    return m


def leer_archivo(nombre, contenido):
    n = nombre.lower()
    if n.endswith(".json"):
        datos = json.loads(contenido.decode("utf-8-sig"))
        if isinstance(datos, dict):
            datos = next((datos[k] for k in ("patrones", "registros", "data") if k in datos), None) or [datos]
        return pd.DataFrame(datos)
    if n.endswith((".csv", ".txt")):
        df = pd.read_csv(io.BytesIO(contenido), encoding="utf-8-sig")
        if df.shape[1] == 1:  # separador ";"
            df = pd.read_csv(io.BytesIO(contenido), sep=";", encoding="utf-8-sig")
        return df
    raise ValueError("Formato no soportado: usa un archivo .csv o .json")


def normalizar(df):
    df = df.rename(columns=ALIAS)
    faltan = [c for c in COLS if c not in df.columns]
    if faltan:
        raise ValueError("Faltan columnas: " + ", ".join(faltan) + ". La etiqueta puede llamarse HeartDiseaseorAttack u objetivo.")
    df = df[COLS].copy()
    for c in COLS:
        if not pd.api.types.is_numeric_dtype(df[c]):
            df[c] = df[c].map(lambda v: TOK.get(v.strip().lower(), v) if isinstance(v, str) else v)
        df[c] = pd.to_numeric(df[c], errors="coerce")
    return df


def importar(nombre, contenido, omitir_duplicados=False):
    df = normalizar(leer_archivo(nombre, contenido))
    if df.empty:
        raise ValueError("El archivo no tiene filas.")
    if len(df) > 500_000:
        raise ValueError("Máximo 500.000 filas por archivo.")
    resumen = {"filas_leidas": len(df), "con_nulos": int(df.isna().any(axis=1).sum()),
               "fuera_de_rango": int(mask_fuera(df).any(axis=1).sum()), "duplicados_en_archivo": int(df.duplicated().sum())}
    if omitir_duplicados:
        df = df.drop_duplicates()
    resumen["importadas"] = db.insertar_df(df, "json" if nombre.lower().endswith(".json") else "csv")
    return resumen


def registrar(datos, origen="manual"):
    db.insertar_df(pd.DataFrame([datos]), origen)
    with db.conexion() as c:
        return c.execute("SELECT MAX(id) FROM patrones").fetchone()[0]


# ------------------------------------------------------------------ limpieza
def _limites_iqr(s):
    q1, q3 = s.quantile([0.25, 0.75])
    iqr = q3 - q1
    return float(q1 - 1.5 * iqr), float(q3 + 1.5 * iqr)


def _activos():
    with db.conexion() as c:
        return c.execute("SELECT COUNT(*) FROM patrones WHERE activo=1").fetchone()[0]


def _desactivar(ids):
    ids = [(int(i),) for i in ids]
    with db.conexion() as c:
        c.executemany("UPDATE patrones SET activo=0 WHERE id=?", ids)
    return len(ids)


def analizar_limpieza():
    df = db.cargar_df()
    if df.empty:
        return {"activos": 0}
    fuera = mask_fuera(df)
    lo, hi = _limites_iqr(df["BMI"].dropna()) if df["BMI"].notna().any() else (0, 0)
    return {"activos": len(df),
            "nulos": {c: int(df[c].isna().sum()) for c in COLS if df[c].isna().any()},
            "filas_con_nulos": int(df[COLS].isna().any(axis=1).sum()),
            "fuera_de_rango": {c: int(fuera[c].sum()) for c in COLS if fuera[c].any()},
            "filas_fuera_de_rango": int(fuera.any(axis=1).sum()),
            "duplicados": int(df.duplicated(subset=COLS).sum()),
            "outliers_bmi": {"inferior": round(lo, 1), "superior": round(hi, 1),
                             "n": int(((df["BMI"] < lo) | (df["BMI"] > hi)).sum())}}


def aplicar_limpieza(op):
    antes, pasos = _activos(), []
    if op.get("fuera_de_rango") == "eliminar":
        df = db.cargar_df()
        pasos.append({"paso": "Filas con valores fuera de rango eliminadas", "filas": _desactivar(df.id[mask_fuera(df).any(axis=1)])})
    modo = op.get("nulos", "ignorar")
    if modo in ("eliminar", "imputar"):
        df = db.cargar_df()
        ids = df.id[df[COLS].isna().any(axis=1)] if modo == "eliminar" else df.id[df[OBJ].isna()]
        pasos.append({"paso": "Filas con nulos eliminadas" if modo == "eliminar" else "Filas sin etiqueta eliminadas",
                      "filas": _desactivar(ids)})
        if modo == "imputar":
            resto, total = df[~df.id.isin(ids)], 0
            with db.conexion() as c:
                for col in ORIG:
                    if resto[col].isna().any():
                        if col in NUM_ORIG:
                            v = float(resto[col].median())
                            v = v if col == "BMI" else float(round(v))
                        else:
                            v = float(resto[col].mode().iloc[0])
                        total += c.execute(f"UPDATE patrones SET {col}=? WHERE activo=1 AND {col} IS NULL", (v,)).rowcount
            pasos.append({"paso": "Nulos imputados (mediana en numéricas, moda en binarias)", "filas": total})
    modo = op.get("outliers_bmi", "ignorar")
    if modo in ("recortar", "eliminar"):
        df = db.cargar_df()
        lo, hi = _limites_iqr(df["BMI"].dropna())
        if modo == "eliminar":
            n = _desactivar(df.id[(df["BMI"] < lo) | (df["BMI"] > hi)])
        else:
            with db.conexion() as c:
                n = c.execute("UPDATE patrones SET BMI=? WHERE activo=1 AND BMI<?", (lo, lo)).rowcount
                n += c.execute("UPDATE patrones SET BMI=? WHERE activo=1 AND BMI>?", (hi, hi)).rowcount
        pasos.append({"paso": f"Outliers de IMC {'eliminados' if modo == 'eliminar' else 'recortados'} (rango IQR {lo:.1f}–{hi:.1f})", "filas": n})
    if op.get("duplicados"):
        df = db.cargar_df()
        pasos.append({"paso": "Duplicados eliminados (se conserva el primero)", "filas": _desactivar(df.id[df.duplicated(subset=COLS, keep="first")])})
    return {"antes": antes, "despues": _activos(), "pasos": pasos}


def restaurar():
    with db.conexion() as c:
        return c.execute("UPDATE patrones SET activo=1 WHERE activo=0").rowcount


# ------------------------------------------------------------------ estadística descriptiva
def estadisticas():
    df = db.cargar_df()
    if df.empty:
        return {"vacio": True}
    y = df[OBJ]
    pos, neg = df[y == 1], df[y == 0]
    num = []
    for c in NUM_ORIG:
        s = df[c].dropna()
        q = s.quantile([0.25, 0.5, 0.75])
        num.append({"variable": c, "n": int(s.size), "nulos": int(df[c].isna().sum()), "media": _r(s.mean()), "desv": _r(s.std()),
                    "min": _r(s.min()), "q1": _r(q[0.25]), "mediana": _r(q[0.5]), "q3": _r(q[0.75]), "max": _r(s.max()),
                    "asimetria": _r(s.skew()), "media_enfermos": _r(pos[c].mean()), "media_sanos": _r(neg[c].mean())})
    binarias = [{"variable": c, "n": int(df[c].notna().sum()), "nulos": int(df[c].isna().sum()), "prop": _r(df[c].mean(), 4),
                 "prop_enfermos": _r(pos[c].mean(), 4), "prop_sanos": _r(neg[c].mean(), 4)} for c in BIN_ORIG]
    bordes = list(range(10, 65, 5))
    bmi = df["BMI"].dropna().clip(10, 59.99)
    cs, _ = np.histogram(bmi[y.loc[bmi.index] == 0], bins=bordes)
    ce, _ = np.histogram(bmi[y.loc[bmi.index] == 1], bins=bordes)
    hist = [{"rango": f"{a}–{b}", "sanos": int(s_), "enfermos": int(e_)} for a, b, s_, e_ in zip(bordes[:-1], bordes[1:], cs, ce)]
    ed = df.groupby("Age")[OBJ].agg(["size", "mean"]).reset_index()
    por_edad = [{"edad": int(r.Age), "n": int(r["size"]), "prevalencia": _r(r["mean"] * 100, 2)} for _, r in ed.iterrows()]
    corr = df[ORIG].corrwith(y).dropna()
    corr = [{"variable": k, "r": _r(v)} for k, v in corr.reindex(corr.abs().sort_values(ascending=False).index).items()]
    return {"n": len(df), "positivos": int(y.sum()), "prevalencia": _r(y.mean(), 4), "numericas": num, "binarias": binarias,
            "histograma_bmi": hist, "por_edad": por_edad, "correlacion": corr}


# ------------------------------------------------------------------ entrenamiento
ESTADO = {"estado": "inactivo", "progreso": 0, "paso": "", "mensaje": "", "inicio": None, "id": None, "modo": None}
_cerrojo = threading.Lock()
_py = lambda v: v.item() if hasattr(v, "item") else v


def iniciar_entrenamiento(modo):
    with _cerrojo:
        if ESTADO["estado"] == "corriendo":
            raise RuntimeError("Ya hay un entrenamiento en curso.")
        ESTADO.update(estado="corriendo", progreso=0, paso="Preparando", mensaje="", inicio=ahora(), id=None, modo=modo)
    threading.Thread(target=_entrenar, args=(modo,), daemon=True).start()


def _paso(p, texto):
    ESTADO.update(progreso=int(p), paso=texto)


def _evaluar(m, X, y):
    pred, prob = m.predict(X), m.predict_proba(X)[:, 1]
    r = {"accuracy": accuracy_score(y, pred), "precision": precision_score(y, pred, zero_division=0), "recall": recall_score(y, pred),
         "f1": f1_score(y, pred), "auc": roc_auc_score(y, prob), "pr_auc": average_precision_score(y, prob)}
    return {k: round(float(v), 3) for k, v in r.items()}, pred, prob


def _entrenar(modo):
    t0 = time.time()
    try:
        cfg = db.leer_config()
        seed, est = int(cfg["seed"]), bool(cfg["estratificar"])
        _paso(3, "Cargando patrones activos")
        bruto = db.cargar_df()
        df = bruto.drop_duplicates(subset=COLS).dropna(subset=COLS)
        df = df[~mask_fuera(df).any(axis=1)]
        descartadas = len(bruto) - len(df)
        y = df[OBJ].astype(int)
        if len(df) < 300 or y.value_counts().reindex([0, 1], fill_value=0).min() < 30:
            raise ValueError("Se necesitan al menos 300 patrones válidos y 30 de cada clase para entrenar.")
        X = derivar(df)[BIN + NUM]
        _paso(8, "Particionando los datos")
        tr, va, te = cfg["train"], cfg["val"], cfg["test"]
        X_tmp, X_test, y_tmp, y_test = train_test_split(X, y, test_size=te / 100, stratify=y if est else None, random_state=seed)
        X_train, X_val, y_train, y_val = train_test_split(X_tmp, y_tmp, test_size=va / (tr + va), stratify=y_tmp if est else None, random_state=seed)
        if any(p.nunique() != 2 for p in (y_train, y_val, y_test)):
            raise ValueError("Las tres particiones deben contener ambas clases. Activa la estratificación o ajusta los porcentajes.")

        prep = ColumnTransformer([("num", StandardScaler(), NUM), ("bin", "passthrough", BIN)])
        pipe = lambda e: Pipeline([("prep", clone(prep)), ("clf", e)])
        espec = {
            "Reg. logística": (LogisticRegression(max_iter=1000, class_weight="balanced"), {"C": [0.01, 0.1, 1, 10]}, {"C": 1.0}),
            "Árbol de decisión": (DecisionTreeClassifier(class_weight="balanced", random_state=seed),
                                  {"max_depth": [4, 6, 8, 10], "min_samples_leaf": [20, 50, 100]}, {"max_depth": 8, "min_samples_leaf": 50}),
            "Random Forest": (RandomForestClassifier(class_weight="balanced_subsample", random_state=seed, n_jobs=-1),
                              {"n_estimators": [100, 200], "max_depth": [8, 12], "min_samples_leaf": [10, 30]},
                              {"n_estimators": 100, "max_depth": 12, "min_samples_leaf": 10}),
            "Gradient Boosting": (HistGradientBoostingClassifier(class_weight="balanced", random_state=seed),
                                  {"learning_rate": [0.05, 0.1], "max_depth": [3, 5], "max_iter": [100, 200]},
                                  {"learning_rate": 0.1, "max_depth": 5, "max_iter": 100}),
        }
        _paso(12, "Entrenando Baseline")
        entrenados, hiper = {"Baseline": pipe(LogisticRegression(max_iter=1000)).fit(X_train, y_train)}, {"Baseline": {}}
        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=seed)
        for i, (nombre, (e, grilla, fijo)) in enumerate(espec.items()):
            _paso(20 + i * 17, f"{'Ajustando' if modo == 'completo' else 'Entrenando'} {nombre} ({i + 1}/4)")
            if modo == "completo":
                if len(X_train) > TUNE_N:
                    Xs, _, ys, _ = train_test_split(X_train, y_train, train_size=TUNE_N, stratify=y_train if est else None, random_state=seed)
                else:
                    Xs, ys = X_train, y_train
                gs = GridSearchCV(pipe(clone(e)), {f"clf__{k}": v for k, v in grilla.items()}, cv=cv, scoring="roc_auc", n_jobs=-1).fit(Xs, ys)
                mejor = {k.replace("clf__", ""): _py(v) for k, v in gs.best_params_.items()}
            else:
                mejor = fijo
            entrenados[nombre] = pipe(clone(e).set_params(**mejor)).fit(X_train, y_train)
            hiper[nombre] = mejor

        _paso(92, "Evaluando en validación y test")
        test, evaluaciones = [], {}
        for n, m in entrenados.items():
            metricas, pred, prob = _evaluar(m, X_test, y_test)
            test.append({"nombre": n, **metricas})
            evaluaciones[n] = {**metricas, "pred": pred, "prob": prob}
        val = [{"nombre": n, **_evaluar(m, X_val, y_val)[0]} for n, m in entrenados.items()]
        lr = entrenados["Reg. logística"]
        esc, coef = lr.named_steps["prep"].named_transformers_["num"], lr.named_steps["clf"].coef_[0]
        modelo = {"num": NUM, "mu": np.round(esc.mean_, 5).tolist(), "sd": np.round(esc.scale_, 5).tolist(),
                  "w": np.round(coef[:len(NUM)], 5).tolist(), "bin": BIN, "wb": np.round(coef[len(NUM):], 5).tolist(),
                  "b": round(float(lr.named_steps["clf"].intercept_[0]), 5), "P": round(float(y_train.mean()), 5)}
        _paso(95, "Generando las siete gráficas en Python")
        imagenes = graficas.generar(evaluaciones, modelo, lr, X, y, X_train, y_train, X_val, y_val, y_test, seed)
        _paso(99, "Guardando resultados y gráficas")
        nuevo = db.guardar_entrenamiento({"fecha": ahora(), "modo": modo, "config": cfg, "n_total": len(df), "n_train": len(X_train),
                                          "n_val": len(X_val), "n_test": len(X_test), "descartadas": descartadas,
                                          "duracion": round(time.time() - t0, 1), "metricas": test, "validacion": val,
                                          "hiperparametros": hiper, "modelo": modelo}, imagenes)
        ESTADO.update(estado="listo", progreso=100, paso="Entrenamiento completado", id=nuevo, mensaje=f"Terminó en {time.time() - t0:.0f} s")
    except Exception as e:
        ESTADO.update(estado="error", mensaje=str(e)[:300], paso="Falló el entrenamiento")


# ------------------------------------------------------------------ dashboard
def resumen_entrenamiento(e):
    if not e:
        return None
    mejor = max((m for m in e["metricas"] if m["nombre"] != "Baseline"), key=lambda m: m["auc"])
    return {"id": e["id"], "fecha": e["fecha"], "modo": e["modo"], "config": e["config"], "mejor": mejor["nombre"],
            "auc": mejor["auc"], "f1": mejor["f1"], "recall": mejor["recall"], "precision": mejor["precision"],
            "n_total": e["n_total"], "n_train": e["n_train"], "n_val": e["n_val"], "n_test": e["n_test"],
            "descartadas": e["descartadas"], "duracion": e["duracion"]}


def dashboard():
    with db.conexion() as c:
        tot, act, pos = c.execute("SELECT COUNT(*), COALESCE(SUM(activo),0), COALESCE(SUM(CASE WHEN activo=1 AND objetivo=1 THEN 1 ELSE 0 END),0) FROM patrones").fetchone()
        origen = [dict(r) for r in c.execute("SELECT origen, COALESCE(SUM(activo),0) AS activos, COUNT(*) AS total FROM patrones GROUP BY origen ORDER BY total DESC")]
        ultimos = [dict(r) for r in c.execute("SELECT id, origen, creado, activo, objetivo, Age, BMI FROM patrones ORDER BY id DESC LIMIT 6")]
        n_ent = c.execute("SELECT COUNT(*) FROM entrenamientos").fetchone()[0]
    ult = db.ultimo_entrenamiento()
    modelo = resumen_entrenamiento(ult)
    if modelo:
        modelo["metricas"] = ult["metricas"]
    return {"hora": ahora(), "base": dict(BASE), "entrenamiento": dict(ESTADO), "n_entrenamientos": n_ent, "config": db.leer_config(),
            "patrones": {"total": tot, "activos": act, "inactivos": tot - act, "positivos": pos,
                         "prevalencia": (pos / act) if act else 0, "por_origen": origen, "ultimos": ultimos},
            "modelo": modelo, "historial": [resumen_entrenamiento(h) for h in db.historial(20)]}
