import { useRef, useState } from 'react'
import { api } from '../../lib/api'
import vars from '../../data/variables.json'
import { fmt } from '../../lib/format'

const COLS = vars.filter((v) => v[2] === 'o').map((v) => v[0])
const EJ = { HighBP: 1, HighChol: 1, CholCheck: 1, Smoker: 0, Stroke: 0, PhysActivity: 1, Fruits: 1, Veggies: 1, HvyAlcoholConsump: 0, AnyHealthcare: 1,
  NoDocbcCost: 0, DiffWalk: 0, Sex: 0, BMI: 27, MentHlth: 0, PhysHlth: 0, GenHlth: 3, Age: 7, Education: 5, Income: 6, Diabetes: 0 }
const bajar = (nombre, texto, tipo) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function Importar({ onGuardado }) {
  const [archivo, setArchivo] = useState(null)
  const [sobre, setSobre] = useState(false)
  const [omitir, setOmitir] = useState(true)
  const [res, setRes] = useState(null)
  const [cargando, setCargando] = useState(false)
  const input = useRef(null)

  const soltar = (e) => { e.preventDefault(); setSobre(false); const a = e.dataTransfer.files?.[0]; if (a) { setArchivo(a); setRes(null) } }
  const enviar = async () => {
    const fd = new FormData(); fd.append('archivo', archivo); fd.append('omitir_duplicados', omitir)
    setCargando(true); setRes(null)
    try { setRes({ ok: true, d: await api.subir('/patrones/importar', fd) }); onGuardado() } catch (e) { setRes({ ok: false, t: e.message }) } finally { setCargando(false) }
  }

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="panel p-4">
          <h2 className="h6 fw-bold mb-3">Importar un lote de patrones</h2>
          <div className={'border-2 border-dashed rounded-4 p-5 text-center transition-all duration-300 ' + (sobre ? 'scale-[1.02]' : '')}
            style={{ borderColor: sobre ? '#007ba7' : 'var(--bs-border-color)', background: sobre ? '#007ba714' : 'transparent', cursor: 'pointer' }}
            onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setSobre(true) }} onDragLeave={() => setSobre(false)} onDrop={soltar}>
            <div className="fw-semibold">{archivo ? archivo.name : 'Arrastra aquí tu archivo .csv o .json'}</div>
            <div className="small mut">{archivo ? `${fmt(archivo.size / 1024, 1)} KB` : 'o haz clic para elegirlo'}</div>
            <input ref={input} type="file" accept=".csv,.json,.txt" hidden onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setRes(null) }} />
          </div>
          <div className="form-check form-switch my-3">
            <input className="form-check-input" type="checkbox" role="switch" id="omitir" checked={omitir} onChange={(e) => setOmitir(e.target.checked)} />
            <label className="form-check-label small fw-medium" htmlFor="omitir">Omitir filas repetidas dentro del archivo</label>
          </div>
          <button className="btn btn-ac btn-lg w-100" disabled={!archivo || cargando} onClick={enviar}>{cargando ? 'Importando…' : 'Importar al sistema'}</button>
          {res && !res.ok && <div className="small text-danger mt-3 animate-up" role="alert">{res.t}</div>}
          {res?.ok && (
            <div className="row g-2 mt-2 animate-up">
              {[['Filas leídas', res.d.filas_leidas], ['Importadas', res.d.importadas], ['Con nulos', res.d.con_nulos], ['Fuera de rango', res.d.fuera_de_rango], ['Duplicadas en el archivo', res.d.duplicados_en_archivo]].map(([l, v]) => (
                <div key={l} className="col-6 col-md-4"><div className="rounded-3 p-3" style={{ background: 'var(--chip)' }}><div className="h5 fw-bold mb-0">{fmt(v)}</div><div className="small mut">{l}</div></div></div>
              ))}
              <div className="col-12 small mut">Los nulos y valores fuera de rango se guardan tal cual: corrígelos en la pestaña Limpieza.</div>
            </div>
          )}
        </div>
      </div>
      <div className="col-lg-5">
        <div className="panel p-4 h-100">
          <h2 className="h6 fw-bold">Formato esperado</h2>
          <p className="small mut">Las 21 variables originales más la etiqueta <code>HeartDiseaseorAttack</code> (o <code>objetivo</code>). Acepta 0/1, Sí/No y Hombre/Mujer; el CSV puede separarse con coma o punto y coma. En JSON: una lista de objetos o <code>{'{ "patrones": [...] }'}</code>.</p>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => bajar('plantilla_patrones.csv', [...COLS, 'HeartDiseaseorAttack'].join(',') + '\n' + [...COLS.map((c) => EJ[c]), 0].join(',') + '\n', 'text/csv')}>Plantilla CSV</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => bajar('plantilla_patrones.json', JSON.stringify({ patrones: [{ ...EJ, HeartDiseaseorAttack: 0 }] }, null, 2), 'application/json')}>Plantilla JSON</button>
          </div>
        </div>
      </div>
    </div>
  )
}
