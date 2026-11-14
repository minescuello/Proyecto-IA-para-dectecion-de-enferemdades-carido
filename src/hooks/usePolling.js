import { useCallback, useEffect, useRef, useState } from 'react'

// Consulta una función asíncrona cada `ms` milisegundos (datos "en vivo").
export function usePolling(fn, ms) {
  const [estado, setEstado] = useState({ data: null, error: null })
  const ref = useRef(fn)
  ref.current = fn
  const cargar = useCallback(async () => {
    try { setEstado({ data: await ref.current(), error: null }) } catch (e) { setEstado((s) => ({ ...s, error: e.message })) }
  }, [])
  useEffect(() => { cargar(); const id = setInterval(cargar, ms); return () => clearInterval(id) }, [cargar, ms])
  return { ...estado, recargar: cargar }
}
