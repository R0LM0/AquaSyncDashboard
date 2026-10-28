import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Single hook for every animation decision: charts, counters and skeletons. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia?.(QUERY)
    if (!media) return

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  return reduced
}
