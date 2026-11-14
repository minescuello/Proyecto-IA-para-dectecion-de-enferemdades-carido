"""API de CardioIA (FastAPI). Ejecutar desde la carpeta cardioia-react:
    python -m uvicorn server.main:app --port 8000
"""
import threading
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from . import db
from . import servicios as s


@asynccontextmanager
async def ciclo(app):
    db.iniciar()
    threading.Thread(target=s.sembrar_base, daemon=True).start()
    yield


app = FastAPI(title="CardioIA API", version="1.0.0", lifespan=ciclo)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])

B = lambda: Field(ge=0, le=1)


class PatronIn(BaseModel):
    HighBP: int = B(); HighChol: int = B(); CholCheck: int = B(); Smoker: int = B(); Stroke: int = B()
    PhysActivity: int = B(); Fruits: int = B(); Veggies: int = B(); HvyAlcoholConsump: int = B()
    AnyHealthcare: int = B(); NoDocbcCost: int = B(); DiffWalk: int = B(); Sex: int = B()
    BMI: float = Field(ge=12, le=98)
    MentHlth: int = Field(ge=0, le=30)
    PhysHlth: int = Field(ge=0, le=30)
    GenHlth: int = Field(ge=1, le=5)
    Age: int = Field(ge=1, le=13)
    Education: int = Field(ge=1, le=6)
    Income: int = Field(ge=1, le=8)
    Diabetes: int = Field(ge=0, le=2)
    objetivo: int = B()
    origen: Literal["manual", "paciente"] = "manual"  # quién registra: personal clínico o la propia persona


class ConfigIn(BaseModel):
    train: int
    val: int
    test: int
    seed: int = 42
    estratificar: bool = True


class EntrenarIn(BaseModel):
    modo: Literal["rapido", "completo"] = "rapido"


class LimpiezaIn(BaseModel):
    fuera_de_rango: Literal["ignorar", "eliminar"] = "ignorar"
    nulos: Literal["ignorar", "eliminar", "imputar"] = "ignorar"
    outliers_bmi: Literal["ignorar", "recortar", "eliminar"] = "ignorar"
    duplicados: bool = False


def _422(e):
    return HTTPException(422, str(e))


@app.get("/api/salud")
def salud():
    return {"ok": True, "base": s.BASE, "entrenamiento": s.ESTADO["estado"]}


@app.get("/api/dashboard")
def dashboard():
    return s.dashboard()


@app.get("/api/modelo")
def modelo():
    e = db.ultimo_entrenamiento()
    if not e:
        raise HTTPException(404, "Aún no hay un modelo re-entrenado.")
    return e["modelo"]


@app.get("/api/metricas")
def metricas():
    e = db.ultimo_entrenamiento()
    if not e:
        raise HTTPException(404, "Aún no hay métricas re-entrenadas.")
    return {"n": e["n_total"], "nTest": e["n_test"], "prevalencia": e["modelo"]["P"], "modelos": e["metricas"],
            "validacion": e["validacion"], "hiperparametros": e["hiperparametros"], "entrenamiento": s.resumen_entrenamiento(e)}


@app.get("/api/config")
def leer_config():
    return db.leer_config()


@app.put("/api/config")
def guardar_config(c: ConfigIn):
    if c.train + c.val + c.test != 100:
        raise HTTPException(422, "Train + validación + test debe sumar 100 %.")
    if c.test < 5 or c.val < 5 or c.train < 40:
        raise HTTPException(422, "Mínimos: test 5 %, validación 5 %, entrenamiento 40 %.")
    db.guardar_config(c.model_dump())
    return db.leer_config()


@app.post("/api/entrenar")
def entrenar(b: EntrenarIn):
    try:
        s.iniciar_entrenamiento(b.modo)
    except RuntimeError as e:
        raise HTTPException(409, str(e))
    return s.ESTADO


@app.get("/api/entrenamiento/estado")
def estado():
    return s.ESTADO


@app.get("/api/graficas")
def listar_graficas():
    entrenamiento, nombres = db.listar_graficas()
    return {"entrenamiento": entrenamiento, "nombres": nombres}


@app.get("/api/graficas/{entrenamiento_id}/{nombre}.png", response_class=Response)
def grafica(entrenamiento_id: int, nombre: str):
    png = db.leer_grafica(entrenamiento_id, nombre)
    if png is None:
        raise HTTPException(404, "No se encontró esa gráfica del entrenamiento.")
    return Response(png, media_type="image/png", headers={"Cache-Control": "no-cache"})


@app.get("/api/patrones")
def listar(pagina: int = 1, limite: int = 15, origen: str = "", estado: str = "activos"):
    limite, pagina = max(1, min(limite, 100)), max(1, pagina)
    cond, par = [], []
    if estado == "activos":
        cond.append("activo=1")
    elif estado == "inactivos":
        cond.append("activo=0")
    if origen:
        cond.append("origen=?")
        par.append(origen)
    donde = ("WHERE " + " AND ".join(cond)) if cond else ""
    with db.conexion() as c:
        total = c.execute(f"SELECT COUNT(*) FROM patrones {donde}", par).fetchone()[0]
        filas = [dict(r) for r in c.execute(f"SELECT * FROM patrones {donde} ORDER BY id DESC LIMIT ? OFFSET ?", [*par, limite, (pagina - 1) * limite])]
    return {"total": total, "pagina": pagina, "limite": limite, "filas": filas}


@app.post("/api/patrones")
def crear(p: PatronIn):
    d = p.model_dump()
    return {"id": s.registrar(d, d.pop("origen"))}


@app.delete("/api/patrones/{pid}")
def desactivar(pid: int):
    with db.conexion() as c:
        if not c.execute("UPDATE patrones SET activo=0 WHERE id=?", (pid,)).rowcount:
            raise HTTPException(404, "Patrón no encontrado.")
    return {"ok": True}


@app.post("/api/patrones/{pid}/restaurar")
def reactivar(pid: int):
    with db.conexion() as c:
        if not c.execute("UPDATE patrones SET activo=1 WHERE id=?", (pid,)).rowcount:
            raise HTTPException(404, "Patrón no encontrado.")
    return {"ok": True}


@app.post("/api/patrones/importar")
def importar(archivo: UploadFile = File(...), omitir_duplicados: bool = Form(False)):
    try:
        return s.importar(archivo.filename or "", archivo.file.read(), omitir_duplicados)
    except ValueError as e:
        raise _422(e)
    except Exception as e:
        raise _422(f"No se pudo leer el archivo: {e}")


@app.get("/api/estadisticas")
def estadisticas():
    return s.estadisticas()


@app.post("/api/limpieza/analizar")
def limpieza_analizar():
    return s.analizar_limpieza()


@app.post("/api/limpieza/aplicar")
def limpieza_aplicar(o: LimpiezaIn):
    return s.aplicar_limpieza(o.model_dump())


@app.post("/api/limpieza/restaurar")
def limpieza_restaurar():
    return {"restauradas": s.restaurar()}


@app.post("/api/dataset/semilla")
def recargar_base():
    threading.Thread(target=s.sembrar_base, kwargs={"forzar": True}, daemon=True).start()
    return s.BASE
