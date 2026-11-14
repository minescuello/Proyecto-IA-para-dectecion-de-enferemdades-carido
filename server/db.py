"""Persistencia en SQLite: patrones, configuración de la partición y entrenamientos."""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

import pandas as pd

from .esquema import OBJ, ORIG

RUTA = os.environ.get("CARDIOIA_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "cardioia.db"))
CONFIG_BASE = {"train": 60, "val": 20, "test": 20, "seed": 42, "estratificar": True}
COLS = ORIG + [OBJ]


@contextmanager
def conexion():
    os.makedirs(os.path.dirname(RUTA), exist_ok=True)
    c = sqlite3.connect(RUTA, timeout=30)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def iniciar():
    with conexion() as c:
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("CREATE TABLE IF NOT EXISTS patrones (id INTEGER PRIMARY KEY AUTOINCREMENT, origen TEXT NOT NULL, "
                  "creado TEXT NOT NULL, activo INTEGER NOT NULL DEFAULT 1, "
                  + ", ".join(f"{k} REAL" for k in ORIG) + ", objetivo INTEGER)")
        c.execute("CREATE INDEX IF NOT EXISTS ix_pat_activo ON patrones(activo, origen)")
        c.execute("CREATE TABLE IF NOT EXISTS config (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)")
        c.execute("CREATE TABLE IF NOT EXISTS entrenamientos (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, "
                  "modo TEXT NOT NULL, config TEXT NOT NULL, n_total INTEGER, n_train INTEGER, n_val INTEGER, "
                  "n_test INTEGER, descartadas INTEGER, duracion REAL, metricas TEXT NOT NULL, "
                  "validacion TEXT NOT NULL, hiperparametros TEXT NOT NULL, modelo TEXT NOT NULL)")
        c.execute("CREATE TABLE IF NOT EXISTS graficas_entrenamiento ("
                  "entrenamiento_id INTEGER NOT NULL REFERENCES entrenamientos(id), "
                  "nombre TEXT NOT NULL, png BLOB NOT NULL, PRIMARY KEY (entrenamiento_id, nombre))")


def leer_config():
    with conexion() as c:
        filas = {r["clave"]: json.loads(r["valor"]) for r in c.execute("SELECT clave, valor FROM config")}
    return {**CONFIG_BASE, **filas}


def guardar_config(cfg):
    with conexion() as c:
        c.executemany("INSERT INTO config(clave, valor) VALUES (?, ?) "
                      "ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor",
                      [(k, json.dumps(v)) for k, v in cfg.items()])


def insertar_df(df, origen):
    marca = datetime.now().isoformat(timespec="seconds")
    base = df[COLS]
    d = base.astype(object).where(base.notna(), None)
    filas = [[origen, marca, 1, *f] for f in d.values.tolist()]
    marcas = ",".join("?" * (len(COLS) + 3))
    with conexion() as c:
        c.executemany(f"INSERT INTO patrones (origen, creado, activo, {', '.join(COLS)}) VALUES ({marcas})", filas)
    return len(filas)


def cargar_df(solo_activos=True):
    # id es la clave primaria. Leer en su orden evita ordenar por separado todos los activos.
    sql = ("SELECT id, origen, activo, " + ", ".join(COLS) + " FROM patrones NOT INDEXED"
           + (" WHERE activo=1" if solo_activos else "") + " ORDER BY id")
    with conexion() as c:
        return pd.read_sql_query(sql, c)


def guardar_entrenamiento(r, imagenes):
    with conexion() as c:
        cur = c.execute(
            "INSERT INTO entrenamientos (fecha, modo, config, n_total, n_train, n_val, n_test, descartadas, duracion, "
            "metricas, validacion, hiperparametros, modelo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (r["fecha"], r["modo"], json.dumps(r["config"]), r["n_total"], r["n_train"], r["n_val"], r["n_test"],
             r["descartadas"], r["duracion"], json.dumps(r["metricas"]), json.dumps(r["validacion"]),
             json.dumps(r["hiperparametros"]), json.dumps(r["modelo"])))
        nuevo = cur.lastrowid
        c.executemany("INSERT INTO graficas_entrenamiento(entrenamiento_id, nombre, png) VALUES (?,?,?)",
                      [(nuevo, nombre, png) for nombre, png in imagenes.items()])
        return nuevo


def listar_graficas():
    with conexion() as c:
        filas = c.execute("SELECT entrenamiento_id, nombre FROM graficas_entrenamiento "
                          "WHERE entrenamiento_id = (SELECT MAX(id) FROM entrenamientos) ORDER BY nombre").fetchall()
    return filas[0]["entrenamiento_id"] if filas else None, [r["nombre"] for r in filas]


def leer_grafica(entrenamiento_id, nombre):
    with conexion() as c:
        fila = c.execute("SELECT png FROM graficas_entrenamiento WHERE entrenamiento_id=? AND nombre=?",
                         (entrenamiento_id, nombre)).fetchone()
    return fila["png"] if fila else None


def _fila(r):
    d = dict(r)
    for k in ("config", "metricas", "validacion", "hiperparametros", "modelo"):
        d[k] = json.loads(d[k])
    return d


def ultimo_entrenamiento():
    with conexion() as c:
        r = c.execute("SELECT * FROM entrenamientos ORDER BY id DESC LIMIT 1").fetchone()
    return _fila(r) if r else None


def historial(n=20):
    with conexion() as c:
        filas = c.execute("SELECT * FROM entrenamientos ORDER BY id DESC LIMIT ?", (n,)).fetchall()
    return [_fila(r) for r in reversed(filas)]
