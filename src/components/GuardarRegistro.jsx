import { useState } from 'react'
import { api } from '../lib/api'

// Tras ver su resultado, la persona puede sumar su caso (anónimo) como un patrón nuevo.
export default function GuardarRegistro({ x, conectada }) {
  const [antec, setAntec] = useState('')
  const [acepto, setAcepto] = useState(false)
  const [est, setEst] = useState(null)
  const [envio, setEnvio] = useState(false)

  const guardar = async () => {
    setEnvio(true); setEst(null)
    try {
      const datos = Object.fromEntries(Object.entries({ ...x, MentHlth: Math.round(x.MentHlth), PhysHlth: Math.round(x.PhysHlth) }).map(([k, v]) => [k, Number(v)]))
      const r = await api.post('/patrones', { ...datos, objetivo: Number(antec), origen: 'paciente' })
      setEst({ ok: true, t: `¡Gracias! Tu registro anónimo (#${r.id}) se sumó como un caso nuevo.` })
    } catch (e) { setEst({ ok: false, t: e.message }) } finally { setEnvio(false) }
  }

  return (
    <div className="text-start border-top pt-3 mt-3">
      <h3 className="h6 fw-bold">Ayuda a mejorar el modelo</h3>
      <p className="small mut">Es opcional. Guardamos tus respuestas sin nombre ni documento, como un caso más para entrenar el modelo.</p>
      {est?.ok ? <div className="small text-success animate-up" role="status">{est.t}</div> : (
        <>
          <label className="form-label small fw-semibold mb-1" htmlFor="g-antec">¿Algún médico te ha dicho que tienes enfermedad cardíaca o has tenido un infarto?</label>
          <select id="g-antec" className="form-select mb-2" value={antec} onChange={(e) => setAntec(e.target.value)}>
            <option value="">Elige una opción…</option><option value="0">No</option><option value="1">Sí</option>
          </select>
          <div className="form-check mb-3">
            <input className="form-check-input" type="checkbox" id="g-ok" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} />
            <label className="form-check-label small" htmlFor="g-ok">Acepto que mis respuestas se guarden de forma anónima para mejorar el modelo.</label>
          </div>
          <button type="button" className="btn btn-ac w-100" disabled={!conectada || envio || antec === '' || !acepto} onClick={guardar}>
            {envio ? 'Guardando…' : 'Guardar mi registro'}
          </button>
          {!conectada && <div className="small mut mt-2">No hay conexión con el servidor: tu resultado se calculó, pero ahora no se puede guardar.</div>}
          {est && !est.ok && <div className="small text-danger mt-2" role="alert">{est.t}</div>}
        </>
      )}
    </div>
  )
}
