import { useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useMap } from 'react-leaflet'

/**
 * "Pantalla completa" control shared by the maps: toggles the browser Fullscreen API on the enclosing
 * `.map-shell` (Esc exits natively) and re-measures the Leaflet map whenever the fullscreen state changes.
 */
export function FullscreenButton() {
  const map = useMap()
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => {
      setFullscreen(Boolean(document.fullscreenElement))
      // The container resizes after the browser finishes the transition.
      setTimeout(() => map.invalidateSize(), 100)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [map])

  const toggleFullscreen = () => {
    const shell = map.getContainer().closest('.map-shell')
    if (!shell) return
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else void (shell as HTMLElement).requestFullscreen?.()
  }

  const label = fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="grid size-9 place-items-center rounded-lg border border-border-subtle bg-surface/95 text-fg shadow-panel hover:text-primary"
      aria-label={label}
      title={label}
    >
      {fullscreen ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
    </button>
  )
}
