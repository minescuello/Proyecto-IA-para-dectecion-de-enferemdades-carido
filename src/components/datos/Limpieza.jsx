import { useState } from 'react'
import { api } from '../../lib/api'
import { fmt } from '../../lib/format'

const OPC = [
  ['fuera_de_rango', 'Valores fuera de rango', [['ignorar', 'Ignorar'], ['eliminar', 'Eliminar la fila']]],
  ['nulos', 'Valores nulos', [['ignorar', 'Ignorar'], ['eliminar', 'Eliminar la fila'], ['imputar', 'Imputar (mediana / moda)']]],
  ['outliers_bmi', 'Outliers de IMC (IQR)', [['ignorar', 'Ignorar'], ['recortar', 'Recortar a los límites'], ['eliminar', 'Eliminar la fila']]],
]

export default function Limpieza({ onGuardado }) {
  const [an, setAn] = useState(null)
  const [opc, setOpc] = useState({ fuera_de_rango: 'ignorar', nulos: 'ignorar', outliers_bmi: 'ignorar', duplicados: false })
  const [res, setRes] = useState(null)
  const [msg, setMsg] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const run = async (fn) => { setOcupado(true); setMsg(null); try { await fn() } catch (e) { setMsg(e.message) } finally { setOcupado(false) } }
  const analizar = () => run(async () => { setAn(await api.post('/limpieza/analizar')) })
  const aplicar = () => {
    if (!window.confirm('Se marcarán como inactivas las filas elegidas y se modificarán valores imputados o recortados. ¿Continuar?')) return
    run(async () => { setRes(await api.post('/limpieza/aplicar', opc)); setAn(await api.post('/limpieza/analizar')); onGuardado() })
  }
  const restaurar = () => run(async () => { const r = await api.post('/limpieza/restaurar'); setRes({ restauradas: r.restauradas }); setAn(await api.post('/limpieza/analizar')); onGuardado() })

  const tarjetas = an && an.activos ? [
    ['Filas activas', an.activos], ['Filas con nulos', an.filas_con_nulos], ['Fuera de rango', an.filas_fuera_de_rango],
    ['Duplicados', an.duplicados], [`Outliers IMC (${an.outliers_bmi.inferior}–${an.outliers_bmi.superior})`, an.outliers_bmi.n],
  ] : []

  return (
    <div className="row g-3">
      <div className="col-lg-7">
        <div className="panel p-4 h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 fw-bold mb-0">Diagnóstico de calidad</h2>
            <button className="btn btn-ac btn-sm px-3" onClick={analizar} disabled={ocupado}>{ocupado && !an ? 'Analizando…' : 'Analizar datos'}</button>
          </div>
          {!an && <p className="small mut mb-0">Detecta nulos, valores fuera de rango, duplicados y outliers de IMC entre los patrones activos.</p>}
          <div className="row g-2">
            {tarjetas.map(([l, v], i) => (
              <div key={l} className="col-6 col-md-4 animate-up" style={{ animationDelay: i * 70 + 'ms' }}>
                <div className="rounded-3 p-3 h-100" style={{ background: 'var(--chip)' }}><div className="h5 fw-bold mb-0">{fmt(v)}</div><div className="small mut">{l}</div></div>
              </div>
            ))}
          </div>
          {an?.nulos && Object.keys(an.nulos).length > 0 && <p className="small mut mt-3 mb-0">Nulos por columna: {Object.entries(an.nulos).map(([k, v]) => `${k} (${fmt(v)})`).join(', ')}.</p>}
          {an?.fuera_de_rango && Object.keys(an.fuera_de_rango).length > 0 && <p className="small mut mt-1 mb-0">Fuera de rango: {Object.entries(an.fuera_de_rango).map(([k, v]) => `${k} (${fmt(v)})`).join(', ')}.</p>}
        </div>
      </div>
      <div className="col-lg-5">
        <div className="panel p-4 h-100">
          <h2 className="h6 fw-bold mb-3">Aplicar limpieza</h2>
          {OPC.map(([k, l, o]) => (
            <div key={k} className="mb-3">
              <label htmlFor={'l-' + k} className="form-label small fw-semibold mb-1">{l}</label>
              <select id={'l-' + k} className="form-select form-select-sm" value={opc[k]} onChange={(e) => setOpc({ ...opc, [k]: e.target.value })}>{o.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
            </div>
          ))}
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" role="switch" id="l-dup" checked={opc.duplicados} onChange={(e) => setOpc({ ...opc, duplicados: e.target.checked })} />
            <label className="form-check-label small fw-medium" htmlFor="l-dup">Eliminar duplicados (conserva el primero)</label>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-ac flex-grow-1" onClick={aplicar} disabled={ocupado}>Aplicar</button>
            <button className="btn btn-outline-secondary" onClick={restaurar} disabled={ocupado} title="Reactiva las filas desactivadas; no deshace imputaciones ni recortes">Restaurar filas</button>
          </div>
          {msg && <div className="small text-danger mt-3" role="alert">{msg}</div>}
          {res?.pasos && (
            <div className="mt-3 small animate-up">
              <div className="fw-semibold mb-1">{fmt(res.antes)} → {fmt(res.despues)} filas activas</div>
              {res.pasos.length === 0 ? <div className="mut">No se eligió ninguna acción.</div> : res.pasos.map((p) => <div key={p.paso} className="mut">· {p.paso}: <b className="text-body">{fmt(p.filas)}</b></div>)}
            </div>
          )}
          {res?.restauradas != null && <div className="small mt-3 mut animate-up">{fmt(res.restauradas)} filas reactivadas.</div>}
        </div>
      </div>
    </div>
  )
}
