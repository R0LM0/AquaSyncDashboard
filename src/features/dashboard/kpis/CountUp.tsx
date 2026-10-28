import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../useReducedMotion'
import { countUpValue } from './countUpValue'

/** Animated counter; static under reduced motion. */
export function CountUp({
  value,
  format,
  duration = 800,
}: {
  value: number
  format: (value: number) => string
  duration?: number
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(() => (reduced ? value : 0))
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) return

    const from = fromRef.current
    // The first frame timestamp starts the animation: rAF and performance.now()
    // do not share an origin in every environment.
    let start: number | null = null
    let raf = 0

    const tick = (now: number) => {
      if (start === null) start = now
      const progress = (now - start) / duration
      setDisplay(countUpValue(from, value, progress))
      if (progress < 1) raf = window.requestAnimationFrame(tick)
      else fromRef.current = value
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return <>{format(reduced ? value : display)}</>
}
