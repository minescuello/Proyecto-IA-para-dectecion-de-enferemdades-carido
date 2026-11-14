import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { Cargando } from './ui'
import { Tarjeta, eje, tip, rejilla } from './charts'
import { fmt } from '../lib/format'

const AC = '#007ba7', GRIS = '#8da2ac', BAD = '#dc2626', OK = '#059669'
const AGE = ['18–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70–74', '75–79', '80+']
const f = (v, d = 2) => (v == null ? '—' : fmt(v, d))
const pct = (v) => (v == null ? '—' : fmt(v * 100, 1) + ' %')

export default function Estadistica() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [q, setQ] = useState('')
  const cargar = () => {
    setCargando(true)
    api.get('/estadisticas').then((r) => { setD(r); setErr(null) }).catch((e) => setErr(e.message)).finally(() => setCargando(false))
  }
  useEffect(() => { cargar() }, [])

  if (!d) return <Cargando error={err} />
  if (d.vacio) return <div className="panel p-4 mut">No hay patrones activos todavía.</div>
  const ok = (x) => x.variable.toLowerCase().includes(q.toLowerCase())
  const num = d.numericas.filter(ok), bin = d.binarias.filter(ok)
  const dif = [...d.binarias].map((b) => ({ ...b, dif: (b.prop_enfermos ?? 0) - (b.prop_sanos ?? 0) })).sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif)).slice(0, 4)
  const edad = d.por_edad.map((x) => ({ etq: AGE[x.edad - 1], prevalencia: x.prevalencia, n: x.n }))
  const corr = d.correlacion.slice(0, 12)

  return (
    <div className="animate-sl">
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <div className="small mut flex-grow-1"><b className="text-body">{fmt(d.n)}</b> patrones activos · <b className="text-body">{fmt(d.positivos)}</b> con antecedente ({pct(d.prevalencia)})</div>
        <input className="form-control form-control-sm" style={{ maxWidth: 220 }} placeholder="Filtrar variable…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ac btn-sm px-3" onClick={cargar} disabled={cargando}>{cargando ? 'Calculando…' : 'Actualizar'}</button>
      </div>

      <div className="panel p-4 mb-3">
        <h2 className="h6 fw-bold mb-3">Variables numéricas y ordinales</h2>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0 small text-nowrap">
            <thead><tr><th>Variable</th><th>n</th><th>Nulos</th><th>Media</th><th>Desv.</th><th>Mín</th><th>Q1</th><th>Mediana</th><th>Q3</th><th>Máx</th><th>Asim.</th><th>Media enfermos</th><th>Media sanos</th></tr></thead>
            <tbody>{num.map((x) => (
              <tr key={x.variable}><td className="fw-semibold font-monospace">{x.variable}</td><td>{fmt(x.n)}</td><td>{fmt(x.nulos)}</td><td>{f(x.media)}</td><td>{f(x.desv)}</td><td>{f(x.min)}</td><td>{f(x.q1)}</td><td>{f(x.mediana)}</td><td>{f(x.q3)}</td><td>{f(x.max)}</td><td>{f(x.asimetria)}</td><td>{f(x.media_enfermos)}</td><td>{f(x.media_sanos)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="panel p-4 mb-3">
        <h2 className="h6 fw-bold mb-3">Variables binarias (proporción con valor 1)</h2>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0 small">
            <thead><tr><th>Variable</th><th>n</th><th>Nulos</th><th style={{ minWidth: 140 }}>Total</th><th>En enfermos</th><th>En sanos</th></tr></thead>
            <tbody>{bin.map((x) => (
              <tr key={x.variable}><td className="fw-semibold font-monospace">{x.variable}</td><td>{fmt(x.n)}</td><td>{fmt(x.nulos)}</td>
                <td><div className="d-flex align-items-center gap-2"><div className="progress flex-grow-1" style={{ height: 6 }}><div className="progress-bar" style={{ width: (x.prop ?? 0) * 100 + '%', background: AC }} /></div><span style={{ width: 48 }}>{pct(x.prop)}</span></div></td>
                <td>{pct(x.prop_enfermos)}</td><td>{pct(x.prop_sanos)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <Tarjeta t="Distribución del IMC" sub="Pacientes por rango de IMC, separados por etiqueta.">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.histograma_bmi} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                {rejilla}<XAxis dataKey="rango" {...eje} /><YAxis {...eje} /><Tooltip {...tip} formatter={(v) => fmt(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sanos" name="Sin antecedente" stackId="a" fill={GRIS} animationDuration={900} />
                <Bar dataKey="enfermos" name="Con antecedente" stackId="a" fill={AC} radius={[6, 6, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </Tarjeta>
        </div>
        <div className="col-lg-6">
          <Tarjeta t="Prevalencia por grupo de edad" sub="Porcentaje de patrones con antecedente en cada categoría de edad.">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={edad} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                {rejilla}<XAxis dataKey="etq" {...eje} interval={0} tick={{ fill: 'currentColor', fontSize: 9 }} /><YAxis {...eje} tickFormatter={(v) => v + '%'} />
                <Tooltip {...tip} formatter={(v, n, p) => [fmt(v, 1) + ' %  (n = ' + fmt(p.payload.n) + ')', 'Prevalencia']} />
                <Bar dataKey="prevalencia" fill={AC} radius={[6, 6, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </Tarjeta>
        </div>
        <div className="col-lg-7">
          <Tarjeta t="Correlación con la etiqueta" sub="Pearson entre cada variable original y tener antecedente. Rojo: sube; verde: baja.">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={corr} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity=".1" />
                <XAxis type="number" {...eje} /><YAxis type="category" dataKey="variable" width={120} {...eje} tick={{ fill: 'currentColor', fontSize: 10 }} />
                <Tooltip {...tip} formatter={(v) => fmt(v, 3)} />
                <Bar dataKey="r" name="r de Pearson" radius={4} animationDuration={1000}>{corr.map((c) => <Cell key={c.variable} fill={c.r > 0 ? BAD : OK} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Tarjeta>
        </div>
        <div className="col-lg-5">
          <Tarjeta t="Lectura rápida" sub="Las binarias que más separan a enfermos de sanos.">
            {dif.map((b) => (
              <div key={b.variable} className="mb-3 small">
                <div className="fw-semibold font-monospace">{b.variable}</div>
                <div className="mut">{pct(b.prop_enfermos)} en enfermos frente a {pct(b.prop_sanos)} en sanos ({b.dif > 0 ? '+' : ''}{fmt(b.dif * 100, 1)} pp)</div>
              </div>
            ))}
            <p className="small mut mb-0">Son asociaciones descriptivas de tus datos, no relaciones de causa.</p>
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}
