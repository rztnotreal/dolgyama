import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0)
  const targetRef = useRef(target)
  const valueRef = useRef(0)

  useEffect(() => {
    const from = valueRef.current
    targetRef.current = target

    if (from === target) {
      setValue(target)
      valueRef.current = target
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      valueRef.current = target
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.round(from + (target - from) * eased)
      valueRef.current = next
      setValue(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return value
}
