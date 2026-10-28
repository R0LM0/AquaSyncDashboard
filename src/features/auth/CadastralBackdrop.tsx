import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  buildPlan,
  crewPosition,
  neighbours,
  prelight,
  recycleLots,
  seededRandom,
  stepCrew,
  type CadastralPlan,
  type Crew,
} from './cadastralModel'

/** Slight rotation of the street grid, like a city plan that is not north-aligned. */
const GRID_ANGLE = -0.12
/** Crew walking speed in CSS pixels per second. */
const CREW_SPEED = 46
const STAR_COUNT = 46
const STAR_LINK = 130

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  warm: boolean
}

interface Palette {
  primary: string
  accent: string
  fg: string
}

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    primary: read('--primary', '187 82% 55%'),
    accent: read('--accent', '38 94% 62%'),
    fg: read('--fg', '200 40% 96%'),
  }
}

const hsl = (triplet: string, alpha: number) => `hsl(${triplet} / ${alpha})`

/**
 * Login backdrop: a live cadastral plan. A field crew walks the streets and
 * the lots it passes light up (aqua = worked, amber = corrected location),
 * under a faint drifting network. Static under prefers-reduced-motion and
 * paused while the tab is hidden.
 */
export function CadastralBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d') ?? null
    if (!canvas || !context) return
    const ctx = context

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const random = seededRandom(42)
    let palette = readPalette(document.documentElement)
    let width = 0
    let height = 0
    let plan: CadastralPlan = buildPlan(1, 1, random)
    let crew: Crew = { from: 0, to: 0, t: 0, trail: [] }
    let stars: Star[] = []
    let frame = 0
    let last = 0
    let sincePalette = 0
    let sinceRecycle = 0

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)

      // Build the plan on the diagonal so the rotated grid still covers the corners.
      const span = Math.hypot(width, height)
      plan = buildPlan(span, span, random)
      const start = Math.floor(plan.rows / 2) * plan.cols + Math.floor(plan.cols / 2)
      crew = { from: start, to: neighbours(plan, start)[0], t: 0, trail: [] }

      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: random() * width,
        y: random() * height,
        vx: (random() - 0.5) * 9,
        vy: (random() - 0.5) * 9,
        warm: random() < 0.16,
      }))

      if (reduceMotion) prelight(plan, 0.18, random)
    }

    const drawPlan = (now: number) => {
      const span = Math.hypot(width, height)
      ctx.save()
      ctx.translate(width / 2, height / 2)
      ctx.rotate(GRID_ANGLE)
      ctx.translate(-span / 2, -span / 2)

      ctx.lineWidth = 1
      ctx.strokeStyle = hsl(palette.fg, 0.075)
      for (const lot of plan.lots) {
        if (lot.state === 'idle') {
          ctx.strokeRect(lot.x, lot.y, lot.w, lot.h)
          continue
        }
        const tone = lot.state === 'corrected' ? palette.accent : palette.primary
        const age = now - lot.since
        const fill = Math.min(1, age / 900)
        ctx.fillStyle = hsl(tone, 0.2 * fill)
        ctx.fillRect(lot.x, lot.y, lot.w, lot.h)
        // Fresh lots get a brighter outline that settles after a second.
        const flash = age < 1400 ? 1 - age / 1400 : 0
        ctx.strokeStyle = hsl(tone, 0.32 + 0.45 * flash)
        ctx.strokeRect(lot.x, lot.y, lot.w, lot.h)
        ctx.strokeStyle = hsl(palette.fg, 0.075)
      }

      if (!reduceMotion && crew.trail.length > 1) {
        ctx.setLineDash([4, 7])
        ctx.lineWidth = 1.6
        ctx.strokeStyle = hsl(palette.primary, 0.5)
        ctx.beginPath()
        crew.trail.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
        ctx.stroke()
        ctx.setLineDash([])

        const p = crewPosition(plan, crew)
        const pulse = 0.5 + 0.5 * Math.sin(now / 380)
        ctx.fillStyle = hsl(palette.primary, 0.16 + 0.12 * pulse)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 9 + 3 * pulse, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = hsl(palette.primary, 0.95)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const drawStars = () => {
      for (let i = 0; i < stars.length; i += 1) {
        for (let j = i + 1; j < stars.length; j += 1) {
          const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y)
          if (d < STAR_LINK) {
            ctx.strokeStyle = hsl(palette.primary, (1 - d / STAR_LINK) * 0.14)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(stars[i].x, stars[i].y)
            ctx.lineTo(stars[j].x, stars[j].y)
            ctx.stroke()
          }
        }
      }
      for (const star of stars) {
        ctx.fillStyle = hsl(star.warm ? palette.accent : palette.primary, 0.55)
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.warm ? 1.8 : 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height)
      drawPlan(now)
      drawStars()
    }

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now

      stepCrew(plan, crew, CREW_SPEED * dt, now, random)
      for (const star of stars) {
        star.x += star.vx * dt
        star.y += star.vy * dt
        if (star.x < 0 || star.x > width) star.vx *= -1
        if (star.y < 0 || star.y > height) star.vy *= -1
      }

      sincePalette += dt
      if (sincePalette > 1) {
        palette = readPalette(document.documentElement)
        sincePalette = 0
      }
      sinceRecycle += dt
      if (sinceRecycle > 2) {
        recycleLots(plan, 0.22)
        sinceRecycle = 0
      }

      render(now)
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frame || reduceMotion) return
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start())

    setup()
    render(0)
    start()

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      setup()
      render(performance.now())
    }) : null
    observer?.observe(canvas)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="cadastral-backdrop"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
