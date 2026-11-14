import Formulario from './Formulario'
import { Icono } from './icons'

const PASOS = [
  ['clipboard', '1. Responde', 'Unas preguntas sobre tu salud y tus hábitos. No pedimos nombre ni documento.'],
  ['target', '2. Mira tu resultado', 'Te mostramos tu riesgo estimado frente al promedio y qué datos pesan más.'],
  ['plus', '3. Ayuda a mejorar (opcional)', 'Si quieres, tu registro anónimo se suma como un caso nuevo para mejorar el modelo.'],
]

// Vista del usuario final: la persona ingresa sus propios datos y ve su riesgo estimado.
export default function Paciente({ conectada }) {
  return (
    <div>
      <section className="hero mb-4 animate-up">
        <div className="eyebrow" style={{ color: '#79d6f6' }}>Para ti</div>
        <h1 className="titulo mb-2">Conoce tu riesgo cardíaco en dos minutos</h1>
        <p className="mb-0" style={{ maxWidth: 560, opacity: 0.88 }}>Es una orientación educativa, no un diagnóstico. Si algo te preocupa, consulta con un profesional de la salud.</p>
      </section>
      <div className="row g-3 mb-4">
        {PASOS.map(([i, t, d], k) => (
          <div key={t} className="col-md-4">
            <div className="panel panel-hover p-3 h-100 d-flex gap-3 animate-up" style={{ animationDelay: k * 110 + 'ms' }}>
              <span className="acceso-ico"><Icono n={i} /></span>
              <div><div className="fw-bold">{t}</div><div className="small mut">{d}</div></div>
            </div>
          </div>
        ))}
      </div>
      <Formulario guardar conectada={conectada} />
    </div>
  )
}
