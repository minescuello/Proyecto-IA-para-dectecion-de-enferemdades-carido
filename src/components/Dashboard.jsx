import { useEffect, useId, useState } from 'react'
import { Area, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { usePolling } from '../hooks/usePolling'
import { useTween } from '../hooks/useTween'
import { api } from '../lib/api'
import { Cargando } from './ui'
import { Icono } from './icons'
import { Tarjeta, eje, tip, rejilla } from './charts'
import { fmt } from '../lib/format'
import './dashboard.css'

const AC = '#007ba7', OK = '#059669', WARN = '#d97706'
const TONOS = [AC, '#4594a8', WARN, '#8da2ac', '#365f72']
const fecha = (s) => (s ? s.replace('T', ' ').slice(0, 16) : '—')
const delay = (i) => ({ animationDelay: `${i * 90}ms` })

// Dispara las transiciones CSS (anillos y medidores) justo después de montar
const useMontado = () => {
  const [on, setOn] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(r) }, [])
  return on
}

const Anillo = ({ v, size = 150, oscuro, texto, pct, d = 3 }) => {
  const id = useId().replace(/:/g, ''), on = useMontado(), R = 54, L = 2 * Math.PI * R
  const n = useTween(v * 100, 1300), k = Math.min(Math.max(v, 0), 1)
  return (
    <div className="anillo" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={`${texto} ${fmt(pct ? v * 100 : v, pct ? 0 : d)}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={oscuro ? '#79d6f6' : AC} /><stop offset="1" stopColor={oscuro ? '#ffffff' : '#4594a8'} />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={R} fill="none" stroke={oscuro ? '#ffffff26' : 'currentColor'} strokeOpacity={oscuro ? 1 : 0.1} strokeWidth="12" />
        <circle cx="70" cy="70" r={R} fill="none" stroke={`url(#${id})`} strokeWidth="12" strokeLinecap="round" strokeDasharray={L}
          strokeDashoffset={on ? L * (1 - k) : L} transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="anillo-c"><b>{pct ? fmt(n, 0) + ' %' : fmt(n / 100, d)}</b><span>{texto}</span></div>
    </div>
  )
}

const Chip = ({ v, l, d = 0, s = '' }) => {
  const n = useTween(v, 1400)
  return <div className="hero-chip"><b>{fmt(n, d)}{s}</b><span>{l}</span></div>
}

const Medidor = ({ l, v, c, i }) => {
  const on = useMontado()
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1"><span className="fw-semibold">{l}</span><span className="fw-bold">{fmt(v, 3)}</span></div>
      <div className="meter"><i style={{ width: on ? v * 100 + '%' : 0, background: c, transitionDelay: i * 120 + 'ms' }} /></div>
    </div>
  )
}

function Evolucion({ hist }) {
  const g = useId().replace(/:/g, '')
  return (
    <Tarjeta t="Evolución entre entrenamientos" sub="Cada punto es un re-entrenamiento con los patrones disponibles en ese momento.">
      {hist.length === 0 ? <div className="small mut py-5 text-center">Todavía no hay datos para graficar.</div> : (
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={hist} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={AC} stopOpacity=".38" /><stop offset="1" stopColor={AC} stopOpacity="0" /></linearGradient></defs>
            {rejilla}<XAxis dataKey="id" {...eje} /><YAxis {...eje} domain={[0, 1]} />
            <Tooltip {...tip} formatter={(v) => fmt(v, 3)} />
            <Area dataKey="AUC" stroke={AC} strokeWidth={2.5} fill={`url(#${g})`} dot={{ r: 4 }} animationDuration={1000} />
            <Line dataKey="F1" stroke={WARN} strokeWidth={2} dot={{ r: 3 }} animationDuration={1000} />
            <Line dataKey="Recall" stroke={OK} strokeWidth={2} dot={{ r: 3 }} animationDuration={1000} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <div className="d-flex gap-3 small mut mt-2">
        {[['AUC', AC], ['F1', WARN], ['Recall', OK]].map(([n, c]) => <span key={n}><i className="dot" style={{ background: c }} />{n}</span>)}
      </div>
    </Tarjeta>
  )
}

export default function Dashboard() {
  const { data: d, error } = usePolling(() => api.get('/dashboard'), 2500)
  if (!d) return <Cargando error={error} />
  const { patrones: p, entrenamiento: e, modelo: m, base } = d
  const hist = d.historial.map((h) => ({ id: '#' + h.id, AUC: h.auc, F1: h.f1, Recall: h.recall }))
  const origen = p.por_origen.map((o) => ({ name: o.origen, value: o.activos }))
  const total = origen.reduce((a, o) => a + o.value, 0)

  return (
    <div className="animate-sl dash">
      <section className="hero dash-hero animate-up">
        <div>
          <div className="eyebrow" style={{ color: '#79d6f6' }}>Centro de control</div>
          <h1 className="titulo mb-1">Panel en vivo del modelo</h1>
          <p className="mb-0 small" style={{ opacity: 0.85 }}>
            <span className="punto en-vivo" />En vivo · se actualiza cada 2,5 s
            {base.estado === 'cargando' && <> · {base.mensaje}</>}
            {base.estado === 'error' && <> · <b>{base.mensaje}</b></>}
          </p>
          <div className="hero-chips">
            <Chip v={p.activos} l="patrones activos" />
            <Chip v={p.prevalencia * 100} d={1} s=" %" l="con antecedente" />
            <Chip v={d.n_entrenamientos} l="entrenamientos" />
          </div>
        </div>
        {m ? <Anillo v={m.auc} oscuro size={168} texto={`AUC · ${m.mejor}`} />
          : <div className="hero-vacio"><div className="fw-bold mb-1">Sin re-entrenar</div>La app usa el modelo del prototipo</div>}
      </section>

      <section className="bento">
        <div className="b8 animate-up" style={delay(1)}><Evolucion hist={hist} /></div>

        <div className="b4 animate-up" style={delay(2)}>
          <Tarjeta t="Entrenamiento" sub={e.estado === 'corriendo' ? `Modo ${e.modo} · inició ${fecha(e.inicio)}` : 'Estado del último proceso'}>
            {e.estado === 'corriendo' ? (
              <div className="d-flex align-items-center gap-3"><Anillo v={e.progreso / 100} size={104} pct texto="avance" />
                <div className="small"><span className="badge rounded-pill badge-ac mb-2">corriendo</span><div className="fw-semibold">{e.paso}</div></div></div>
            ) : e.estado === 'error' ? <div className="text-danger small">{e.mensaje}</div> : (
              <div className="d-flex align-items-center gap-3"><span className="acceso-ico"><Icono n="cpu" size={22} /></span>
                <div className="small mut">{m ? `Inactivo. Último entrenamiento: ${fecha(m.fecha)}.` : 'Inactivo. Ve a la pestaña Entrenamiento para crear el primero.'}</div></div>
            )}
          </Tarjeta>
        </div>

        <div className="b7 animate-up" style={delay(3)}>
          <Tarjeta t="Modelo actual" sub={m ? `Entrenamiento #${m.id} · ${fecha(m.fecha)}` : 'Aún no hay entrenamientos guardados'}>
            {m && (<>
              <div className="d-flex align-items-center gap-2 mb-3"><span className="acceso-ico"><Icono n="target" size={20} /></span><div className="h5 fw-bold mb-0">{m.mejor}</div></div>
              <Medidor l="AUC" v={m.auc} c={AC} i={0} /><Medidor l="F1" v={m.f1} c={WARN} i={1} /><Medidor l="Recall" v={m.recall} c={OK} i={2} />
              <div className="small fw-semibold mt-3 mb-1">Partición train / val / test · semilla {m.config.seed}</div>
              <div className="splitbar">{[[m.config.train, AC], [m.config.val, '#4594a8'], [m.config.test, WARN]].map(([f, c], k) => <i key={k} style={{ flex: f, background: c }} />)}</div>
              <div className="d-flex flex-wrap gap-3 small mut mt-2">
                {[['Train', m.config.train, m.n_train, AC], ['Val', m.config.val, m.n_val, '#4594a8'], ['Test', m.config.test, m.n_test, WARN]].map(([n, pc, f, c]) => (
                  <span key={n}><i className="dot" style={{ background: c }} />{n} {pc} % · {fmt(f)}</span>))}
              </div>
              <div className="small mut mt-2">{m.modo} · {fmt(m.duracion, 0)} s{m.descartadas > 0 && ` · ${fmt(m.descartadas)} filas descartadas`}</div>
            </>)}
          </Tarjeta>
        </div>

        <div className="b5 animate-up" style={delay(4)}>
          <Tarjeta t="Patrones por origen" sub="Activos según de dónde llegaron.">
            <div className="position-relative" style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tip} formatter={(v) => fmt(v)} />
                  <Pie data={origen} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={1000}>
                    {origen.map((o, k) => <Cell key={o.name} fill={TONOS[k % TONOS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-c"><b className="h4 mb-0">{fmt(total)}</b><span className="small mut">activos</span></div>
            </div>
            <div className="d-flex flex-wrap gap-3 small justify-content-center mt-2">
              {origen.map((o, k) => <span key={o.name}><i className="dot" style={{ background: TONOS[k % TONOS.length] }} />{o.name} · <b>{fmt(o.value)}</b></span>)}
            </div>
          </Tarjeta>
        </div>

        <div className="animate-up" style={delay(5)}>
          <Tarjeta t="Últimos registros" sub={`${fmt(p.inactivos)} patrones inactivos (eliminados o descartados por limpieza)`}>
            <div className="feed">
              {p.ultimos.map((r, i) => (
                <div key={r.id} className="feed-item animate-up" style={delay(i)}>
                  <div className="feed-ico" title="Edad (categoría)">{r.Age ?? '—'}</div>
                  <div className="flex-grow-1 small">
                    <div className="fw-semibold">#{r.id} · {r.origen}</div>
                    <div className="mut">{fecha(r.creado)} · IMC {r.BMI == null ? '—' : fmt(r.BMI, 1)}</div>
                  </div>
                  <div className="text-end">
                    <span className={'badge rounded-pill ' + (r.activo ? 'badge-ac' : 'chip text-body')}>{r.activo ? 'activo' : 'inactivo'}</span>
                    <div className="mut" style={{ fontSize: '.7rem' }}>{r.objetivo == null ? '—' : r.objetivo ? 'Con antecedente' : 'Sin antecedente'}</div>
                  </div>
                </div>
              ))}
            </div>
          </Tarjeta>
        </div>
      </section>
    </div>
  )
}
