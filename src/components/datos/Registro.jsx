import { useState } from 'react'
import { api } from '../../lib/api'
import { Campo, Sel, Num, Sw, EDAD, EDU, ING, GEN, DIAB, SEXO, SW } from '../Formulario'

const SINO = [[0, 'No tiene antecedente'], [1, 'Tiene antecedente']]
const INI = { Sex: 0, Age: 7, Education: 5, Income: 6, BMI: 27, GenHlth: 3, MentHlth: 0, PhysHlth: 0, Diabetes: 0, HighBP: 0, HighChol: 0,
  CholCheck: 1, Stroke: 0, DiffWalk: 0, Smoker: 0, PhysActivity: 1, Fruits: 1, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, objetivo: 0 }

export default function Registro({ onGuardado }) {
  const [f, setF] = useState(INI)
  const [err, setErr] = useState({})
  const [res, setRes] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))
  const num = (k) => (e) => set(k)(e.target.value)

  const enviar = async (ev) => {
    ev.preventDefault()
    const e = {}
    const r = (k, lo, hi, m) => { const v = Number(f[k]); if (f[k] === '' || !Number.isFinite(v) || v < lo || v > hi) e[k] = m }
    r('BMI', 12, 98, 'IMC entre 12 y 98.'); r('MentHlth', 0, 30, 'Entre 0 y 30 días.'); r('PhysHlth', 0, 30, 'Entre 0 y 30 días.')
    setErr(e)
    if (Object.keys(e).length) return
    setEnviando(true); setRes(null)
    try {
      const r2 = await api.post('/patrones', Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v)])))
      setRes({ ok: true, t: `Patrón #${r2.id} guardado. Se usará en el próximo entrenamiento.` })
      onGuardado()
    } catch (x) { setRes({ ok: false, t: x.message }) } finally { setEnviando(false) }
  }

  return (
    <form className="row g-3" onSubmit={enviar} noValidate>
      <div className="col-lg-7">
        <div className="panel p-4 mb-3">
          <h2 className="h6 fw-bold mb-3">Datos del paciente</h2>
          <div className="row">
            <div className="col-sm-6"><Campo id="r-sex" l="Sexo"><Sel id="r-sex" v={f.Sex} on={set('Sex')} o={SEXO} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-age" l="Edad (años)"><Sel id="r-age" v={f.Age} on={set('Age')} o={EDAD} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-edu" l="Nivel educativo"><Sel id="r-edu" v={f.Education} on={set('Education')} o={EDU} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-inc" l="Ingreso anual del hogar"><Sel id="r-inc" v={f.Income} on={set('Income')} o={ING} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-bmi" l="Índice de masa corporal" error={err.BMI}><Num id="r-bmi" v={f.BMI} on={num('BMI')} unidad="kg/m²" error={err.BMI} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-gen" l="Salud general"><Sel id="r-gen" v={f.GenHlth} on={set('GenHlth')} o={GEN} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-men" l="Días de mala salud mental" error={err.MentHlth}><Num id="r-men" v={f.MentHlth} on={num('MentHlth')} unidad="días" error={err.MentHlth} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-phy" l="Días de mala salud física" error={err.PhysHlth}><Num id="r-phy" v={f.PhysHlth} on={num('PhysHlth')} unidad="días" error={err.PhysHlth} /></Campo></div>
            <div className="col-sm-6"><Campo id="r-dia" l="Diabetes"><Sel id="r-dia" v={f.Diabetes} on={set('Diabetes')} o={DIAB} /></Campo></div>
          </div>
        </div>
        <div className="row g-3">
          {Object.entries(SW).map(([t, lista]) => (
            <div key={t} className="col-md-6"><div className="panel p-4 h-100"><h3 className="h6 fw-bold mb-3">{t}</h3>{lista.map(([k, l, h]) => <Sw key={k} k={'r-' + k} l={l} h={h} f={{ ['r-' + k]: f[k] }} set={() => set(k)} />)}</div></div>
          ))}
        </div>
      </div>
      <div className="col-lg-5">
        <div className="panel p-4 sticky-lg-top" style={{ top: '1rem' }}>
          <h2 className="h6 fw-bold">Etiqueta real</h2>
          <p className="small mut">Es lo que el modelo aprende a clasificar: si esta persona ya tiene antecedente de enfermedad cardíaca o infarto.</p>
          <Campo id="r-obj" l="¿Tiene antecedente de enfermedad cardíaca o infarto?"><Sel id="r-obj" v={f.objetivo} on={set('objetivo')} o={SINO} /></Campo>
          <button type="submit" className="btn btn-ac btn-lg w-100" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar patrón'}</button>
          {res && <div className={'small mt-3 animate-up ' + (res.ok ? 'text-success' : 'text-danger')} role="alert">{res.t}</div>}
          <p className="small mut mt-3 mb-0">Cuando acumules patrones nuevos, ve a la pestaña Entrenamiento para re-entrenar.</p>
        </div>
      </div>
    </form>
  )
}
