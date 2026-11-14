import { useEffect, useState } from 'react'
import { Ecg, Kpi } from './ui'
import { Icono } from './icons'
import { M, meta } from '../lib/estado'
import { risk } from '../lib/risk'
import { fmt } from '../lib/format'
import vars from '../data/variables.json'

const BASE = { CholCheck: 1, Fruits: 1, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, MentHlth: 0, PhysHlth: 0, Education: 5, Income: 6,
  HighBP: 0, HighChol: 0, Stroke: 0, Diabetes: 0, DiffWalk: 0, Smoker: 0, PhysActivity: 1, Sex: 0, Age: 5, BMI: 25, GenHlth: 2 }
const CASOS = [
  ['Perfil joven y activo', 'Mujer 30–34 · IMC 23 · salud excelente', { Sex: 0, Age: 3, BMI: 23, GenHlth: 1 }],
  ['Riesgo intermedio', 'Hombre 55–59 · IMC 29 · presión alta · fuma', { Sex: 1, Age: 8, BMI: 29, GenHlth: 3, HighBP: 1, Smoker: 1 }],
  ['Varios factores de riesgo', 'Hombre 65–69 · IMC 33 · diabetes, colesterol y presión altos', { Sex: 1, Age: 10, BMI: 33, GenHlth: 4, HighBP: 1, HighChol: 1, Diabetes: 2, DiffWalk: 1, Smoker: 1, PhysActivity: 0 }],
]
const ACCESOS = [
  ['dashboard', 'grid', 'Dashboard en vivo', 'Datos y modelo actualizados cada pocos segundos.'],
  ['importar', 'upload', 'Importar datos', 'Sube un lote de patrones desde CSV o JSON.'],
  ['limpieza', 'sparkle', 'Limpieza de datos', 'Nulos, rangos, duplicados y outliers.'],
  ['centro-ia', 'cpu', 'Centro de IA', 'Cambia la partición y re-entrena el modelo.'],
  ['estadistica', 'chart', 'Estadística', 'Descriptiva de los patrones guardados.'],
  ['formulario', 'clipboard', 'Evaluar un caso', 'Ingresa las variables y mira la clasificación.'],
]

export default function Inicio() {
  const [ok, setOk] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setOk(true)); return () => cancelAnimationFrame(id) }, [])
  const mejor = Math.max(...meta.modelos.slice(1).map((m) => m.auc))

  return (
    <div>
      <section className="hero mb-4 animate-up">
        <div className="eyebrow" style={{ color: '#79d6f6' }}>Bienvenido a CardioIA</div>
        <h1 className="titulo text-white" style={{ maxWidth: 640 }}>Una mirada al antecedente cardíaco con datos reales</h1>
        <p style={{ maxWidth: 620, color: '#e2f2f8' }}>Un espacio para explorar, registrar y clasificar casos de enfermedad cardíaca con aprendizaje automático sobre la encuesta BRFSS 2015. Puedes sumar tus propios patrones y re-entrenar el modelo.</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <a href="#registrar" className="btn btn-light rounded-pill px-4 fw-bold">Registrar un caso</a>
          <a href="#formulario" className="btn btn-outline-light rounded-pill px-4 fw-semibold">Evaluar un caso</a>
        </div>
        <Ecg />
      </section>

      <section className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><Kpi i={0} v={meta.n} l="pacientes en el modelo" /></div>
        <div className="col-6 col-lg-3"><Kpi i={1} v={vars.length} l="variables predictoras" /></div>
        <div className="col-6 col-lg-3"><Kpi i={2} v={mejor} d={3} l="AUC del mejor modelo" /></div>
        <div className="col-6 col-lg-3"><Kpi i={3} v={meta.prevalencia * 100} d={1} s=" %" l="casos positivos" /></div>
      </section>

      <h2 className="eyebrow mb-2">Casos de prueba</h2>
      <div className="row g-3 mb-4">
        {CASOS.map(([t, d, x], i) => {
          const p = risk({ ...BASE, ...x }), r = p / M.P
          const c = r < 0.7 ? '#059669' : r < 1.3 ? '#d97706' : '#dc2626'
          return (
            <div key={t} className="col-md-4">
              <div className="panel panel-hover p-4 h-100 animate-up" style={{ animationDelay: i * 90 + 'ms' }}>
                <div className="fw-bold">{t}</div>
                <div className="small mut mb-3">{d}</div>
                <div className="d-flex align-items-baseline justify-content-between mb-1"><span className="h4 fw-bold mb-0" style={{ color: c }}>{fmt(p * 100, 1)} %</span><span className="small mut">≈ {fmt(r, 1)}× el promedio</span></div>
                <div className="progress" style={{ height: 8 }}><div className="progress-bar" style={{ width: ok ? Math.min(p / 0.4, 1) * 100 + '%' : '0%', background: c, transitionDelay: i * 120 + 'ms' }} /></div>
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="eyebrow mb-2">Accesos rápidos</h2>
      <div className="row g-3">
        {ACCESOS.map(([id, ic, t, d], i) => (
          <div key={id} className="col-md-6 col-lg-4">
            <a href={'#' + id} className="panel panel-hover p-4 d-flex gap-3 h-100 text-decoration-none text-body animate-up" style={{ animationDelay: i * 70 + 'ms' }}>
              <span className="acceso-ico"><Icono n={ic} size={20} /></span>
              <span><span className="d-block fw-bold">{t}</span><span className="d-block small mut">{d}</span></span>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
