import { useTween } from '../hooks/useTween'
import { fmt } from '../lib/format'

export const Heart = () => (
  <svg viewBox="0 0 24 24" className="w-14 h-14 animate-beat" fill="var(--ac-ink)" aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 5 6.3 5c2 0 3.7 1.1 5.7 3.3C14 6.1 15.7 5 17.7 5 21 5 23.1 8.3 21.6 11.7 19.5 16.4 12 21 12 21z" />
  </svg>
)

export const Kpi = ({ v, l, d = 0, s = '', i }) => {
  const n = useTween(v, 1400)
  return (
    <div className="panel panel-hover p-4 h-100 animate-up" style={{ animationDelay: `${i * 110}ms` }}>
      <div className="text-3xl font-extrabold tracking-tight">{fmt(n, d)}{s}</div>
      <div className="small mut mt-1">{l}</div>
    </div>
  )
}

export const Seg = ({ v, set, o = [['No', 0], ['Sí', 1]] }) => (
  <div className="btn-group seg" role="group">
    {o.map(([l, k]) => (
      <button key={k} type="button" onClick={() => set(k)} className={'btn btn-sm ' + (v === k ? 'active' : '')}>{l}</button>
    ))}
  </div>
)

export const Gauge = ({ p, base }) => {
  const f = Math.min(p / 0.4, 1), L = 251.3, r = p / base
  const c = r < 0.7 ? '#059669' : r < 1.3 ? '#d97706' : '#dc2626'
  const n = useTween(p * 100, 800)
  const d = 'M20 100A80 80 0 0 1 180 100'
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-xs mx-auto" role="img" aria-label={`Riesgo estimado ${fmt(p * 100, 1)} %`}>
      <path d={d} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="16" strokeLinecap="round" />
      <path d={d} fill="none" stroke={c} strokeWidth="16" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - f)}
        style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1), stroke .4s' }} />
      <text x="100" y="88" textAnchor="middle" fontSize="32" fontWeight="800" fill="currentColor">{fmt(n, 1)} %</text>
      <text x="100" y="108" textAnchor="middle" fontSize="9" fill="currentColor" opacity=".6">escala 0–40 %</text>
    </svg>
  )
}

const ONDA = 'M0 15 H70 L78 15 L84 4 L92 26 L98 15 H130 L136 15 L142 8 L148 15 H240'
export const Ecg = () => (
  <svg viewBox="0 0 240 30" className="ecg" aria-hidden="true" preserveAspectRatio="none">
    <path d={ONDA} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="2" />
    <path d={ONDA} fill="none" stroke="var(--ac-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="28 72" className="animate-ecg" />
  </svg>
)

export const Cargando = ({ error }) => (
  <div className="panel p-5 text-center mut animate-up">
    {error ? <><div className="fw-bold text-body mb-1">No se pudo leer la API</div><div className="small">{error}</div></>
      : <div className="spinner-border spinner-border-sm" role="status" aria-label="Cargando" />}
  </div>
)

export const SinApi = () => (
  <div className="panel p-4 animate-up">
    <h2 className="h6 fw-bold">Esta sección necesita la API de Python</h2>
    <p className="small mut">Guarda patrones, limpia datos, cambia la partición y re-entrena. Desde la carpeta <code>cardioia-react</code>:</p>
    <pre className="small p-3 rounded-3 mb-2" style={{ background: 'var(--chip)' }}>{'pip install -r server/requirements.txt\npython -m uvicorn server.main:app --port 8000'}</pre>
    <p className="small mut mb-0">Esta pantalla se conecta sola en cuanto la API responde.</p>
  </div>
)
