import { useEffect, useState } from 'react'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'

const FIGS = [['curvas_roc', 'Curvas ROC (test)'], ['curvas_precision_recall', 'Curvas precisión–recall'], ['matrices_confusion_test', 'Matrices de confusión'],
  ['importancia_variables', 'Importancia de variables'], ['curvas_aprendizaje', 'Curvas de aprendizaje'], ['distribucion_objetivo', 'Distribución de clases'],
  ['matriz_correlacion', 'Matriz de correlación']]

const referencia = (f) => `${import.meta.env.BASE_URL}resultados/${f}.png`

export default function Galeria({ conectada }) {
  const [abierta, setAbierta] = useState(null)
  const { data } = usePolling(() => (conectada ? api.get('/graficas') : null), 4000)
  const actual = conectada && data?.entrenamiento != null ? data : null
  const lista = actual ? FIGS.filter(([f]) => actual.nombres.includes(f)) : FIGS
  const url = (f) => actual ? `/api/graficas/${actual.entrenamiento}/${f}.png` : referencia(f)
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && setAbierta(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <section className="panel p-4 mt-3">
      <h2 className="h6 fw-bold mb-1">Gráficas del entrenamiento en Python</h2>
      <p className="small mut">
        {actual ? `Resultados del entrenamiento #${actual.entrenamiento}. `
          : 'Gráficas de referencia generadas con BRFSS 2015. Para actualizarlas, ve a Centro de IA y pulsa Entrenar ahora. '}
        Toca una imagen para verla en grande.
      </p>
      <div className="row g-3">
        {lista.map(([f, t], i) => (
          <div key={f} className="col-sm-6 col-lg-4">
            <button type="button" className="btn p-0 border-0 w-100 text-start foto animate-up" style={{ animationDelay: i * 70 + 'ms' }} onClick={() => setAbierta([url(f), t])}>
              <img src={url(f)} alt={t} className="img-fluid rounded-3 border bg-white" loading="lazy" />
              <span className="d-block small fw-semibold mt-1">{t}</span>
            </button>
          </div>
        ))}
      </div>
      {abierta && (
        <div role="dialog" aria-modal="true" aria-label={abierta[1]} onClick={() => setAbierta(null)}
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: '#0a0a0acc', zIndex: 2000, cursor: 'zoom-out' }}>
          <img src={abierta[0]} alt={abierta[1]} className="img-fluid rounded-3 bg-white animate-up" style={{ maxHeight: '92vh' }} />
        </div>
      )}
    </section>
  )
}
