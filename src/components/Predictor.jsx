import { useState } from 'react'
import { M } from '../lib/estado'
import { risk } from '../lib/risk'
import { Gauge, Seg } from './ui'
import { fmt } from '../lib/format'
import { Curva } from './charts'

const AGE = ['18–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70–74', '75–79', '80+']
const GEN = ['Excelente', 'Muy buena', 'Buena', 'Regular', 'Mala']
const FIJOS = { CholCheck: 1, Fruits: 1, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, MentHlth: 0, PhysHlth: 0, Education: 5, Income: 6 }
const SINO = [['HighBP', 'Presión arterial alta'], ['HighChol', 'Colesterol alto'], ['Stroke', 'Accidente cerebrovascular previo'],
  ['DiffWalk', 'Dificultad para caminar'], ['Smoker', 'Ha fumado (100+ cigarrillos)'], ['PhysActivity', 'Actividad física (30 días)']]

const Fila = ({ l, children }) => (
  <div className="d-flex align-items-center justify-content-between gap-3 py-2 border-bottom">
    <span className="small fw-medium">{l}</span>{children}
  </div>
)
const Rango = ({ l, txt, ...r }) => (
  <div className="py-2 border-bottom">
    <div className="d-flex justify-content-between small fw-medium"><span>{l}</span><span className="ac fw-bold">{txt}</span></div>
    <input type="range" className="form-range" {...r} />
  </div>
)

export default function Predictor() {
  const [x, setX] = useState({ Age: 7, Sex: 0, GenHlth: 2, BMI: 27, HighBP: 0, HighChol: 0, Stroke: 0, Diabetes: 0, DiffWalk: 0, Smoker: 0, PhysActivity: 1 })
  const u = (k) => (v) => setX((s) => ({ ...s, [k]: v }))
  const p = risk({ ...FIJOS, ...x })
  const r = p / M.P
  const [txt, color] = r < 0.7 ? ['Por debajo del promedio', '#059669'] : r < 1.3 ? ['Cercano al promedio', '#d97706'] : ['Por encima del promedio', '#dc2626']

  return (
    <div className="row g-3 animate-sl">
      <div className="col-lg-7">
        <div className="panel p-4">
          <Fila l="Sexo"><Seg v={x.Sex} set={u('Sex')} o={[['Mujer', 0], ['Hombre', 1]]} /></Fila>
          <Rango l="Edad" txt={AGE[x.Age - 1] + ' años'} min="1" max="13" value={x.Age} onChange={(e) => u('Age')(+e.target.value)} />
          <Rango l="Índice de masa corporal" txt={x.BMI} min="15" max="50" value={x.BMI} onChange={(e) => u('BMI')(+e.target.value)} />
          <Rango l="Salud general" txt={GEN[x.GenHlth - 1]} min="1" max="5" value={x.GenHlth} onChange={(e) => u('GenHlth')(+e.target.value)} />
          <Fila l="Diabetes"><Seg v={x.Diabetes} set={u('Diabetes')} o={[['No', 0], ['Pre', 1], ['Sí', 2]]} /></Fila>
          {SINO.map(([k, l]) => <Fila key={k} l={l}><Seg v={x[k]} set={u(k)} /></Fila>)}
          <p className="small mut pt-3 mb-0">Las demás variables del modelo se fijan en valores típicos.</p>
        </div>
      </div>
      <div className="col-lg-5">
        <div className="panel p-4 text-center sticky-lg-top" style={{ top: '1rem' }}>
          <Gauge p={p} base={M.P} />
          <span className="d-inline-block mt-2 px-3 py-2 rounded-pill small fw-bold text-white" style={{ background: color, transition: 'background .5s' }}>{txt}</span>
          <p className="mt-3 small mut mb-0">≈ <b className="text-body">{fmt(r, 1)}×</b> el riesgo promedio de la encuesta ({fmt(M.P * 100, 1)} %).</p>
        </div>
      </div>
      <div className="col-lg-6"><Curva x={{ ...FIJOS, ...x }} k="Age" /></div>
      <div className="col-lg-6"><Curva x={{ ...FIJOS, ...x }} k="BMI" /></div>
    </div>
  )
}
