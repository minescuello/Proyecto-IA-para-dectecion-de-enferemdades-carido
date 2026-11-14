import { useEffect, useRef, useState } from 'react'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { Seg } from './ui'
import { Tarjeta } from './charts'
import { fmt } from '../lib/format'

const PARTES = [['Entrenamiento', 'train', '#007ba7'], ['Validación', 'val', '#f59e0b'], ['Test', 'test', '#059669']]
const fecha = (s) => (s ? s.replace('T', ' ').slice(0, 16) : '—')
const MET = [['accuracy', 'Exactitud'], ['precision', 'Precisión'], ['recall', 'Recall'], ['f1', 'F1'], ['auc', 'AUC'], ['pr_auc', 'PR-AUC']]

export default function Entrenamiento({ onActualizado }) {
  const [cfg, setCfg] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [modo, setModo] = useState('rapido')
  const { data: est } = usePolling(() => api.get('/entrenamiento/estado'), 1200)
  const { data: d } = usePolling(() => api.get('/dashboard'), 5000)
  const visto = useRef(undefined)

  useEffect(() => { api.get('/config').then(setCfg).catch((e) => setAviso({ ok: false, t: e.message })) }, [])
  useEffect(() => {
    if (!est) return
    if (visto.current === undefined) { visto.current = est.id; return }
    if (est.estado === 'listo' && est.id !== visto.current) { visto.current = est.id; onActualizado() }
  }, [est])

  if (!cfg) return <div className="panel p-4 mut">Cargando configuración…</div>
  const mover = (k, v) => setCfg((c) => { const n = { ...c, [k]: +v }; n.train = 100 - n.val - n.test; return n })
  const valido = cfg.train >= 40
  const filas = d?.patrones.activos ?? 0
  const corriendo = est?.estado === 'corriendo'
  const m = d?.modelo

  const guardar = async () => {
    try { await api.put('/config', cfg); setAviso({ ok: true, t: 'Partición guardada. Se usará en el próximo entrenamiento.' }) } catch (e) { setAviso({ ok: false, t: e.message }) }
  }
  const entrenar = async () => {
    try { await api.put('/config', cfg); await api.post('/entrenar', { modo }); setAviso(null) } catch (e) { setAviso({ ok: false, t: e.message }) }
  }

  return (
    <div className="animate-sl row g-3">
      <div className="col-lg-6">
        <Tarjeta t="Partición de los datos" sub="Cámbiala cuando quieras: se aplica al siguiente entrenamiento.">
          <div className="progress-stacked mb-2" style={{ height: 30 }}>
            {PARTES.map(([l, k, c]) => (
              <div key={k} className="progress" style={{ width: cfg[k] + '%' }}>
                <div className="progress-bar" style={{ background: c, width: '100%' }}>{cfg[k]} %</div>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-3 small mut mb-3">
            {PARTES.map(([l, k, c]) => <span key={k}><span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: c }} />{l}: ≈ {fmt(Math.round((filas * cfg[k]) / 100))}</span>)}
          </div>
          <label className="form-label small fw-semibold mb-0 d-flex justify-content-between">Test <span className="ac">{cfg.test} %</span></label>
          <input type="range" className="form-range" min="5" max="40" step="5" value={cfg.test} onChange={(e) => mover('test', e.target.value)} />
          <label className="form-label small fw-semibold mb-0 d-flex justify-content-between">Validación <span className="ac">{cfg.val} %</span></label>
          <input type="range" className="form-range" min="5" max="40" step="5" value={cfg.val} onChange={(e) => mover('val', e.target.value)} />
          <div className="small mb-3">Entrenamiento: <b className={valido ? '' : 'text-danger'}>{cfg.train} %</b>{!valido && ' (mínimo 40 %: reduce test o validación)'}</div>
          <div className="row g-3 align-items-end">
            <div className="col-6">
              <label htmlFor="semilla" className="form-label small fw-semibold mb-1">Semilla aleatoria</label>
              <input id="semilla" type="number" className="form-control" value={cfg.seed} onChange={(e) => setCfg({ ...cfg, seed: +e.target.value })} />
            </div>
            <div className="col-6">
              <div className="form-check form-switch">
                <input className="form-check-input" type="checkbox" role="switch" id="estr" checked={cfg.estratificar} onChange={(e) => setCfg({ ...cfg, estratificar: e.target.checked })} />
                <label className="form-check-label small fw-medium" htmlFor="estr">Estratificar por etiqueta</label>
              </div>
            </div>
          </div>
          <button className="btn btn-outline-secondary w-100 mt-3" onClick={guardar} disabled={!valido}>Guardar partición</button>
        </Tarjeta>
      </div>

      <div className="col-lg-6">
        <Tarjeta t="Re-entrenar el modelo" sub="Usa todos los patrones activos (se quitan duplicados, nulos y valores fuera de rango en memoria).">
          <div className="mb-2"><Seg v={modo} set={setModo} o={[['Rápido', 'rapido'], ['Completo', 'completo']]} /></div>
          <p className="small mut">{modo === 'rapido' ? 'Hiperparámetros fijos: tarda unos segundos.' : 'Repite el GridSearchCV de tu script (3 folds, AUC, 20.000 filas): puede tardar varios minutos.'}</p>
          <button className="btn btn-ac btn-lg w-100" onClick={entrenar} disabled={corriendo || !valido}>{corriendo ? 'Entrenando…' : 'Entrenar ahora'}</button>
          {(corriendo || est?.estado === 'listo' || est?.estado === 'error') && est.estado !== 'inactivo' && (
            <div className="mt-3 animate-up">
              <div className="progress mb-2" style={{ height: 14 }}>
                <div className={'progress-bar ' + (corriendo ? 'progress-bar-striped progress-bar-animated' : '')} style={{ width: est.progreso + '%', background: est.estado === 'error' ? '#dc2626' : '#007ba7' }} />
              </div>
              <div className="small">{est.paso} · {est.progreso} %</div>
              {est.mensaje && <div className={'small ' + (est.estado === 'error' ? 'text-danger' : 'mut')}>{est.mensaje}</div>}
            </div>
          )}
          {aviso && <div className={'small mt-3 ' + (aviso.ok ? 'text-success' : 'text-danger')} role="alert">{aviso.t}</div>}
        </Tarjeta>
      </div>

      {m && (
        <div className="col-12">
          <Tarjeta t={`Resultados del entrenamiento #${m.id}`} sub={`${fecha(m.fecha)} · partición ${m.config.train}/${m.config.val}/${m.config.test} % · conjunto de test`}>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0 small">
                <thead><tr><th>Modelo</th>{MET.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
                <tbody>{m.metricas.map((x) => (
                  <tr key={x.nombre} className={x.nombre === m.mejor ? 'fw-bold' : ''}><td>{x.nombre}{x.nombre === m.mejor && <span className="badge badge-ac rounded-pill ms-2">mejor AUC</span>}</td>{MET.map(([k]) => <td key={k}>{fmt(x[k], 3)}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </Tarjeta>
        </div>
      )}
    </div>
  )
}
