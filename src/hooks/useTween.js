import { useEffect, useRef, useState } from 'react'

export function useTween(target, ms = 900) {
  const [value, setValue] = useState(0)
  const last = useRef(0)
  useEffect(() => {
    const from = last.current, t0 = performance.now()
    let raf
    const step = (t) => {
      const k = Math.min((t - t0) / ms, 1)
      last.current = from + (target - from) * (1 - Math.pow(1 - k, 3))
      setValue(last.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return value
}
