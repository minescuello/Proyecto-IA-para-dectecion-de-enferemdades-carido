import { useEffect, useState } from 'react'
import { meta } from '../lib/estado'
import { fmt } from '../lib/format'
import { BarrasMetricas, Coeficientes, Donut, Matriz } from './charts'
import Galeria from './Galeria'

const MET = [['accuracy', 'Exactitud'], ['precision', 'Precisión'], ['recall', 'Recall'], ['f1', 'F1'], ['auc', 'AUC'], ['pr_auc', 'PR-AUC']]
const notasDe = (base) => [
  `Ojo: decir “sano” a todos daría ${fmt(1 - meta.prevalencia, 3)}. Esta métrica engaña con clases desbalanceadas.`,
  'De cada 4 alertas, aproximadamente 1 es un enfermo real.',
  `Aquí se nota el desbalance: el baseline detecta solo el ${fmt(base.recall * 100)} % de los enfermos.`,
  'Equilibrio entre precisión y recall.',
  'Los tres mejores modelos empatan: la diferencia no es relevante.',
  `El azar daría ${fmt(meta.prevalencia, 2)} (la prevalencia); los modelos triplican ese valor.`,
]

export default function Results({ conectada }) {
  const NOTA = notasDe(meta.modelos[0])
  const [m, setM] = useState(4)
  const [ready, setReady] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id) }, [])
  const key = MET[m][0]
  const max = Math.max(...meta.modelos.map((x) => x[key]))

  return (
    <div className="animate-sl">
      <div className="d-flex flex-wrap gap-2 mb-4">
        {MET.map(([k, l], i) => (
          <button key={k} onClick={() => setM(i)} className={'btn btn-sm rounded-pill px-3 py-2 chip ' + (i === m ? 'active' : '')}>{l}</button>
        ))}
      </div>
      <div className="panel p-4">
        {meta.modelos.map((x, i) => (
          <div key={x.nombre} className="mb-3">
            <div className="d-flex justify-content-between small mb-1">
              <span className="fw-semibold">{x.nombre}</span>
              <span className="tabular-nums">{fmt(x[key], 3)}</span>
            </div>
            <div className="progress" style={{ height: 12 }} role="progressbar" aria-valuenow={x[key] * 100} aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar" style={{
                width: ready ? x[key] * 100 + '%' : '0%', transitionDelay: i * 90 + 'ms',
                background: x[key] === max ? 'linear-gradient(90deg,#007ba7,#79d6f6)' : 'linear-gradient(90deg,#475c65,#8da2ac)',
              }} />
            </div>
          </div>
        ))}
        <p className="small mut pt-3 mb-0 border-top">{NOTA[m]}</p>
      </div>
      <div className="row g-3 mt-1">
        <div className="col-lg-7"><BarrasMetricas /></div>
        <div className="col-lg-5"><Donut /></div>
        <div className="col-lg-7"><Coeficientes /></div>
        <div className="col-lg-5"><Matriz /></div>
      </div>
      <Galeria conectada={conectada} />
      <p className="small mut mt-3">Conjunto de prueba ({fmt(meta.nTest)} pacientes). Datos: BRFSS 2015, {fmt(meta.n)} registros sin duplicados.</p>
    </div>
  )
}
