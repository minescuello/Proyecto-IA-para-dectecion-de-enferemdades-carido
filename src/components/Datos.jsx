import { useEffect, useState } from 'react'
import vars from '../data/variables.json'
import { meta } from '../lib/estado'
import { PASOS, MODELOS } from '../data/pipeline'
import { Seg } from './ui'
import { fmt } from '../lib/format'

const Particion = () => {
  const [ready, setReady] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id) }, [])
  const temp = meta.n - meta.nTest, val = Math.ceil(temp * 0.25), train = temp - val
  const parts = [['Train', train, 60, '#007ba7'], ['Validación', val, 20, '#f59e0b'], ['Test', meta.nTest, 20, '#059669']]
  return (
    <div className="panel p-4 mb-4">
      <h2 className="h6 fw-bold mb-3">Partición de los {fmt(meta.n)} registros</h2>
      <div className="progress-stacked" style={{ height: 28 }}>
        {parts.map(([l, n, pct, c]) => (
          <div key={l} className="progress" style={{ width: ready ? pct + '%' : '0%' }}>
            <div className="progress-bar" style={{ background: c, width: '100%' }}>{pct} %</div>
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap gap-3 small mut mt-2">
        {parts.map(([l, n, , c]) => <span key={l}><span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: c }} />{l}: {fmt(n)}</span>)}
      </div>
    </div>
  )
}

const Modelo = ({ m: [nombre, nota, rejilla] }) => {
  const [open, setOpen] = useState(false)
  const claves = Object.entries(rejilla)
  return (
    <div className="border-bottom">
      <button className="btn w-100 text-start d-flex justify-content-between align-items-center py-3 px-0 border-0 fw-semibold"
        onClick={() => setOpen(!open)} aria-expanded={open}>
        {nombre}
        <span className="mut" style={{ transition: 'transform .35s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      <div className={'acc-body ' + (open ? 'open' : '')}>
        <div style={{ overflow: 'hidden' }}>
          <p className="small mut">{nota}</p>
          {claves.length > 0 && (
            <div className="d-flex flex-wrap gap-2 pb-3">
              {claves.map(([k, v]) => <span key={k} className="badge rounded-pill chip text-body">{k}: {v.join(', ')}</span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Datos() {
  const [f, setF] = useState('t')
  const [q, setQ] = useState('')
  const filas = vars.filter(([n, , o, d]) => (f === 't' || o === f) && (n + d).toLowerCase().includes(q.toLowerCase()))
  const der = vars.filter((v) => v[2] === 'd').length

  return (
    <div className="animate-sl">
      <div className="row g-3 mb-4">
        {PASOS.map(([t, d], i) => (
          <div key={t} className="col-12 col-md-6 col-lg-4">
            <div className="panel panel-hover p-4 h-100 animate-up" style={{ animationDelay: i * 90 + 'ms' }}>
              <div className="fw-bold mb-1"><span className="ac me-2">{i + 1}</span>{t}</div>
              <div className="small mut">{d}</div>
            </div>
          </div>
        ))}
      </div>
      <Particion />
      <div className="panel p-4 mb-4">
        <h2 className="h6 fw-bold mb-1">Modelos y rejillas de hiperparámetros</h2>
        {MODELOS.map((m) => <Modelo key={m[0]} m={m} />)}
      </div>
      <div className="panel p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <h2 className="h6 fw-bold mb-0">{vars.length} variables predictoras ({vars.length - der} originales + {der} derivadas)</h2>
          <Seg v={f} set={setF} o={[['Todas', 't'], ['Originales', 'o'], ['Derivadas', 'd']]} />
        </div>
        <input className="form-control mb-3" placeholder="Buscar variable…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="table-responsive" style={{ maxHeight: 420 }}>
          <table className="table table-sm align-middle mb-0">
            <thead><tr><th>Variable</th><th>Tipo</th><th>Origen</th><th>Descripción</th></tr></thead>
            <tbody>
              {filas.map(([n, t, o, d]) => (
                <tr key={n}>
                  <td className="fw-semibold font-monospace small">{n}</td>
                  <td className="small">{t === 'b' ? 'binaria' : 'numérica'}</td>
                  <td><span className={'badge rounded-pill ' + (o === 'd' ? 'badge-ac' : 'chip text-body')}>{o === 'd' ? 'derivada' : 'original'}</span></td>
                  <td className="small mut">{d}</td>
                </tr>
              ))}
              {!filas.length && <tr><td colSpan="4" className="text-center mut py-4">Ninguna variable coincide con “{q}”.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
