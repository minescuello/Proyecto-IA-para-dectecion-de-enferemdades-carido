const BASE = '/api'
const detalle = (j) => (Array.isArray(j.detail) ? j.detail.map((d) => `${d.loc?.slice(-1)[0] ?? ''}: ${d.msg}`).join(' · ') : j.detail ?? JSON.stringify(j))

async function pedir(ruta, opc = {}) {
  const r = await fetch(BASE + ruta, opc)
  if (!r.ok) {
    let msg = `Error ${r.status}`
    try { msg = detalle(await r.json()) } catch { /* sin cuerpo JSON */ }
    const e = new Error(msg); e.status = r.status; throw e
  }
  return r.json()
}
const json = (metodo, cuerpo) => ({ method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

export const api = {
  get: (r) => pedir(r),
  post: (r, b) => pedir(r, json('POST', b ?? {})),
  put: (r, b) => pedir(r, json('PUT', b)),
  del: (r) => pedir(r, { method: 'DELETE' }),
  subir: (r, form) => pedir(r, { method: 'POST', body: form }),
}
