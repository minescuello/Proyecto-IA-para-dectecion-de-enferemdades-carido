"""Esquema de datos compartido: mismas variables y derivadas que proyecto_ia_brfss.py."""
import pandas as pd

OBJ = "objetivo"  # HeartDiseaseorAttack
BIN_ORIG = ["HighBP", "HighChol", "CholCheck", "Smoker", "Stroke", "PhysActivity", "Fruits", "Veggies",
            "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost", "DiffWalk", "Sex"]
NUM_ORIG = ["BMI", "MentHlth", "PhysHlth", "GenHlth", "Age", "Education", "Income", "Diabetes"]
ORIG = BIN_ORIG + NUM_ORIG  # 21 variables originales
DERIV_BIN = ["obesidad", "sobrepeso", "mala_salud_general", "hipertension_y_colesterol",
             "adulto_mayor_65", "ingreso_bajo", "barrera_acceso_salud"]
DERIV_NUM = ["dias_mal_salud_total", "factores_riesgo_total", "habitos_alimentarios"]
BIN = BIN_ORIG + DERIV_BIN
NUM = NUM_ORIG + DERIV_NUM

RANGOS = {c: (0, 1) for c in BIN_ORIG}
RANGOS.update({"BMI": (12, 98), "MentHlth": (0, 30), "PhysHlth": (0, 30), "GenHlth": (1, 5), "Age": (1, 13),
               "Education": (1, 6), "Income": (1, 8), "Diabetes": (0, 2), OBJ: (0, 1)})


def derivar(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    d["obesidad"] = (d["BMI"] >= 30).astype(int)
    d["sobrepeso"] = ((d["BMI"] >= 25) & (d["BMI"] < 30)).astype(int)
    d["dias_mal_salud_total"] = d["MentHlth"] + d["PhysHlth"]
    d["mala_salud_general"] = (d["GenHlth"] >= 4).astype(int)
    d["hipertension_y_colesterol"] = (d["HighBP"] * d["HighChol"]).astype(int)
    d["factores_riesgo_total"] = (d["HighBP"] + d["HighChol"] + d["Smoker"] + (d["Diabetes"] == 2).astype(int)
                                  + d["obesidad"] + (d["PhysActivity"] == 0).astype(int))
    d["adulto_mayor_65"] = (d["Age"] >= 10).astype(int)
    d["habitos_alimentarios"] = d["Fruits"] + d["Veggies"]
    d["ingreso_bajo"] = (d["Income"] <= 4).astype(int)
    d["barrera_acceso_salud"] = ((d["AnyHealthcare"] == 0) | (d["NoDocbcCost"] == 1)).astype(int)
    return d
