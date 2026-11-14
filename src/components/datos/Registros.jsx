import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { fmt } from '../../lib/format'

const AGE = ['18–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70–74', '75–79', '80+']
const fecha = (s) => (s ? s.replace('T', ' ').slice(0, 16) : '—')

export default function Registros({ recarga }) {
  const [estado, setEstado] = useState('activos')
  const [origen, setOrigen] = useState('')
  const [pagina, setPagina] = useState(1)
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  const [v, setV] = useState(0)

  useEffect(() => {
    api.get(`/patrones?pagina=${pagina}&limite=12&estado=${estado}&origen=${origen}`).then((r) => { setD(r); setErr(null) }).catch((e) => setErr(e.message))
  }, [estado, origen, pagina, recarga, v])

  const cambiar = async (r) => { try { r.activo ? await api.del(`/patrones/${r.id}`) : await api.post(`/patrones/${r.id}/restaurar`); setV((x) => x + 1) } catch (e) { setErr(e.message) } }
  const paginas = d ? Math.max(1, Math.ceil(d.total / d.limite)) : 1

  return (
    <div className="panel p-4">
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <h2 className="h6 fw-bold mb-0 me-auto">Registros guardados {d && <span className="mut fw-normal">({fmt(d.total)})</span>}</h2>
        <select className="form-select form-select-sm w-auto" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1) }} aria-label="Estado">
          <option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option>
        </select>
        <select className="form-select form-select-sm w-auto" value={origen} onChange={(e) => { setOrigen(e.target.value); setPagina(1) }} aria-label="Origen">
          <option value="">Todos los orígenes</option><option value="brfss">brfss</option><option value="manual">manual</option><option value="csv">csv</option><option value="json">json</option>
        </select>
      </div>
      {err && <div className="small text-danger mb-2" role="alert">{err}</div>}
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0 small text-nowrap">
          <thead><tr><th>#</th><th>Origen</th><th>Fecha</th><th>Sexo</th><th>Edad</th><th>IMC</th><th>Presión alta</th><th>Salud gen.</th><th>Etiqueta</th><th /></tr></thead>
          <tbody>{(d?.filas ?? []).map((r) => (
            <tr key={r.id} style={{ opacity: r.activo ? 1 : 0.5 }}>
              <td>{r.id}</td><td>{r.origen}</td><td>{fecha(r.creado)}</td><td>{r.Sex == null ? '—' : r.Sex ? 'H' : 'M'}</td><td>{AGE[r.Age - 1] ?? '—'}</td>
              <td>{r.BMI == null ? '—' : fmt(r.BMI, 1)}</td><td>{r.HighBP == null ? '—' : r.HighBP ? 'Sí' : 'No'}</td><td>{r.GenHlth ?? '—'}</td>
              <td>{r.objetivo == null ? '—' : <span className={'badge rounded-pill ' + (r.objetivo ? 'badge-ac' : 'chip text-body')}>{r.objetivo ? 'con' : 'sin'}</span>}</td>
              <td className="text-end"><button className="btn btn-sm btn-outline-secondary py-0" onClick={() => cambiar(r)}>{r.activo ? 'Quitar' : 'Restaurar'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center mt-3 small">
        <button className="btn btn-sm btn-outline-secondary" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
        <span className="mut">Página {pagina} de {fmt(paginas)}</span>
        <button className="btn btn-sm btn-outline-secondary" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
      </div>
    </div>
  )
}
