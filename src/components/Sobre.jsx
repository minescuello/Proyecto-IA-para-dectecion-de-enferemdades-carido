import Datos from './Datos'

const SI = ['Clasifica si el perfil de una persona se parece al de quienes ya reportaron enfermedad coronaria o infarto.',
  'Entrega una probabilidad y la compara con el promedio de la encuesta (≈ 10 %).',
  'Se puede re-entrenar con patrones nuevos y con la partición que elijas.']
const NO = ['No diagnostica ni reemplaza la valoración de un profesional de la salud.',
  'No pronostica si alguien enfermará en el futuro: los datos son de un solo momento (transversales).',
  'No establece causas: los pesos y las curvas son asociaciones del modelo.',
  'Sus datos son autorreportados, de EE. UU. y de 2015.']

const Lista = ({ t, items, c, g }) => (
  <div className="panel p-4 h-100">
    <h2 className="h6 fw-bold mb-3">{t}</h2>
    {items.map((x) => <div key={x} className="d-flex gap-2 small mb-2"><span style={{ color: c, fontWeight: 800 }}>{g}</span><span>{x}</span></div>)}
  </div>
)

export default function Sobre() {
  return (
    <div className="animate-sl">
      <div className="row g-3 mb-4">
        <div className="col-md-6"><Lista t="Qué hace" items={SI} c="#059669" g="✓" /></div>
        <div className="col-md-6"><Lista t="Qué no hace" items={NO} c="#dc2626" g="✕" /></div>
      </div>
      <h2 className="eyebrow mb-2">Cómo se construyó</h2>
      <Datos />
    </div>
  )
}
