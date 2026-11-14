import { useId, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { M } from '../lib/estado'
import { meta } from '../lib/estado'
import { risk } from '../lib/risk'
import { fmt } from '../lib/format'

const AC = '#007ba7', OK = '#059669', WARN = '#d97706', BAD = '#dc2626', GRIS = '#8da2ac'
const AGE = ['18–24', '25–29', '30–34', '35–39', '40–44', '45–49', '50–54', '55–59', '60–64', '65–69', '70–74', '75–79', '80+']
const corto = (n) => n.replace('Gradient Boosting', 'Grad. Boosting').replace('Árbol de decisión', 'Árbol').replace('Reg. logística', 'Reg. log.')
export const eje = { tick: { fill: 'currentColor', fontSize: 11 }, tickLine: false, axisLine: { stroke: 'currentColor', strokeOpacity: 0.2 } }
export const tip = { contentStyle: { background: 'var(--panel)', border: '1px solid var(--bs-border-color)', borderRadius: 12, fontSize: 12, color: 'var(--bs-body-color)' }, cursor: { fill: 'currentColor', fillOpacity: 0.06 } }
export const rejilla = <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity=".1" />

export const Tarjeta = ({ t, sub, children }) => (
  <div className="panel p-4 h-100">
    <h2 className="h6 fw-bold mb-1">{t}</h2>
    {sub && <p className="small mut mb-3">{sub}</p>}
    {children}
  </div>
)

export const BarrasMetricas = () => {
  const data = meta.modelos.map((m) => ({ nombre: corto(m.nombre), Precisión: m.precision, Recall: m.recall, F1: m.f1 }))
  return (
    <Tarjeta t="Precisión, recall y F1 por modelo" sub="Con pocos casos positivos, el baseline casi no detecta enfermos: el recall lo delata.">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="22%">
          {rejilla}
          <XAxis dataKey="nombre" {...eje} interval={0} />
          <YAxis {...eje} domain={[0, 1]} tickFormatter={(v) => fmt(v * 100) + '%'} />
          <Tooltip {...tip} formatter={(v) => fmt(v, 3)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Precisión" fill={GRIS} radius={[6, 6, 0, 0]} animationDuration={900} />
          <Bar dataKey="Recall" fill={AC} radius={[6, 6, 0, 0]} animationDuration={1100} />
          <Bar dataKey="F1" fill="#4594a8" radius={[6, 6, 0, 0]} animationDuration={1300} />
        </BarChart>
      </ResponsiveContainer>
    </Tarjeta>
  )
}

export const Donut = () => {
  const pos = Math.round(meta.n * meta.prevalencia)
  const data = [{ n: 'Sin enfermedad', v: meta.n - pos }, { n: 'Enfermedad o infarto', v: pos }]
  return (
    <Tarjeta t="Distribución de pacientes" sub={`${fmt(meta.n)} registros sin duplicados`}>
      <div className="position-relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="v" nameKey="n" innerRadius={64} outerRadius={92} paddingAngle={3} stroke="none" animationDuration={900}>
              {data.map((d, i) => <Cell key={d.n} fill={i ? AC : GRIS} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v) => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
          <div className="h4 fw-bold mb-0">{fmt(meta.prevalencia * 100, 1)} %</div>
          <div className="small mut">casos positivos</div>
        </div>
      </div>
      <div className="d-flex flex-wrap justify-content-center gap-3 small mut">
        {data.map((d, i) => <span key={d.n}><span className="d-inline-block rounded-circle me-1" style={{ width: 8, height: 8, background: i ? AC : GRIS }} />{d.n}: {fmt(d.v)}</span>)}
      </div>
    </Tarjeta>
  )
}

export const Coeficientes = () => {
  const data = [...M.num.map((n, i) => ({ n, v: M.w[i] })), ...M.bin.map((n, j) => ({ n, v: M.wb[j] }))]
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 12)
  return (
    <Tarjeta t="Variables con más peso en el modelo" sub="Coeficientes de la regresión logística. Rojo sube el riesgo; verde lo baja.">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity=".1" />
          <XAxis type="number" {...eje} />
          <YAxis type="category" dataKey="n" width={150} {...eje} tick={{ fill: 'currentColor', fontSize: 10 }} />
          <Tooltip {...tip} formatter={(v) => fmt(v, 2)} />
          <Bar dataKey="v" name="Coeficiente" radius={4} animationDuration={1000}>
            {data.map((d) => <Cell key={d.n} fill={d.v > 0 ? BAD : OK} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Tarjeta>
  )
}

const Celda = ({ n, tot, ok }) => (
  <div className="rounded-3 p-3 text-center" style={{ background: `rgba(${ok ? '0,123,167' : '220,38,38'},${0.12 + 0.78 * (n / tot)})`, color: n / tot > 0.45 ? '#fff' : 'inherit', transition: 'background .5s' }}>
    <div className="h5 fw-bold mb-0">{fmt(n)}</div>
    <div style={{ fontSize: '.7rem' }}>{fmt((n / tot) * 100)} % de la fila</div>
  </div>
)

export const Matriz = () => {
  const [i, setI] = useState(1)
  const m = meta.modelos[i], pos = Math.round(meta.nTest * meta.prevalencia)
  const tp = Math.round(m.recall * pos), fn = pos - tp
  const fp = Math.round(tp * (1 / m.precision - 1)), tn = meta.nTest - pos - fp
  return (
    <Tarjeta t="Matriz de confusión (test)" sub="Estimada con precisión, recall y prevalencia; puede diferir unas unidades de la real.">
      <select className="form-select form-select-sm mb-3" value={i} onChange={(e) => setI(+e.target.value)} aria-label="Modelo">
        {meta.modelos.map((x, k) => <option key={x.nombre} value={k}>{x.nombre}</option>)}
      </select>
      <div key={i} className="d-grid gap-2 animate-up" style={{ gridTemplateColumns: 'auto 1fr 1fr' }}>
        <span /><span className="small mut text-center">Predice sano</span><span className="small mut text-center">Predice enfermo</span>
        <span className="small mut align-self-center">Real: sano</span><Celda n={tn} tot={tn + fp} ok /><Celda n={fp} tot={tn + fp} />
        <span className="small mut align-self-center">Real: enfermo</span><Celda n={fn} tot={fn + tp} /><Celda n={tp} tot={fn + tp} ok />
      </div>
    </Tarjeta>
  )
}

// Riesgo estimado al variar una sola variable (edad o IMC) y dejar el resto como está.
export const Curva = ({ x, k }) => {
  const id = useId().replace(/:/g, '')
  const edad = k === 'Age'
  const pts = edad ? Array.from({ length: 13 }, (_, i) => i + 1) : Array.from({ length: 36 }, (_, i) => i + 15)
  const data = pts.map((v) => ({ v, r: +(risk({ ...x, [k]: v }) * 100).toFixed(2) }))
  const cur = edad ? x.Age : Math.min(50, Math.max(15, x.BMI))
  return (
    <Tarjeta t={edad ? 'Riesgo según la edad' : 'Riesgo según el IMC'} sub="Solo cambia esta variable; el resto queda como lo ingresaste. El punto eres tú.">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={AC} stopOpacity=".45" /><stop offset="100%" stopColor={AC} stopOpacity=".02" />
            </linearGradient>
          </defs>
          {rejilla}
          <XAxis dataKey="v" type="number" domain={edad ? [1, 13] : [15, 50]} ticks={edad ? [1, 3, 5, 7, 9, 11, 13] : [15, 20, 25, 30, 35, 40, 45, 50]} tickFormatter={(v) => (edad ? AGE[v - 1] : v)} {...eje} />
          <YAxis {...eje} tickFormatter={(v) => v + '%'} width={44} />
          <Tooltip {...tip} formatter={(v) => [fmt(v, 1) + ' %', 'Riesgo']} labelFormatter={(v) => (edad ? AGE[v - 1] + ' años' : 'IMC ' + v)} />
          <ReferenceLine y={M.P * 100} stroke={WARN} strokeDasharray="4 4" label={{ value: 'promedio', fill: WARN, fontSize: 10, position: 'insideTopLeft' }} />
          <Area type="monotone" dataKey="r" stroke={AC} strokeWidth={2.5} fill={`url(#${id})`} animationDuration={1000} />
          <ReferenceDot x={cur} y={risk(x) * 100} r={6} fill={AC} stroke="#fff" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </Tarjeta>
  )
}
