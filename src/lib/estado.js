import modeloBase from '../data/modelo.json'
import metricasBase from '../data/metricas.json'
import { api } from './api'

// Copias mutables: al re-entrenar, la API las reemplaza y toda la app lee los valores nuevos.
export const M = structuredClone(modeloBase)
export const meta = structuredClone(metricasBase)

export async function sincronizar() {
  const [m, t] = await Promise.allSettled([api.get('/modelo'), api.get('/metricas')])
  if (m.status === 'fulfilled') Object.assign(M, m.value)
  if (t.status === 'fulfilled') Object.assign(meta, { n: t.value.n, nTest: t.value.nTest, prevalencia: t.value.prevalencia, modelos: t.value.modelos })
}
