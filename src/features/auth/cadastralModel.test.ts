import { describe, expect, it } from 'vitest'
import {
  buildPlan,
  crewPosition,
  neighbours,
  prelight,
  recycleLots,
  seededRandom,
  stepCrew,
  type Crew,
} from './cadastralModel'

describe('cadastral backdrop model', () => {
  it('builds the same plan for the same seed and covers the viewport', () => {
    const a = buildPlan(1200, 800, seededRandom(7))
    const b = buildPlan(1200, 800, seededRandom(7))

    expect(a.lots.length).toBeGreaterThan(40)
    expect(a.lots).toEqual(b.lots)
    const maxX = Math.max(...a.nodes.map((n) => n.x))
    const maxY = Math.max(...a.nodes.map((n) => n.y))
    expect(maxX).toBeGreaterThanOrEqual(1200)
    expect(maxY).toBeGreaterThanOrEqual(800)
  })

  it('lots never overlap a street: every lot sits inside its block', () => {
    const plan = buildPlan(1000, 700, seededRandom(3))
    for (const lot of plan.lots) {
      expect(lot.w).toBeGreaterThan(0)
      expect(lot.h).toBeGreaterThan(0)
    }
  })

  it('the crew only walks along streets between neighbouring intersections', () => {
    const random = seededRandom(11)
    const plan = buildPlan(900, 600, random)
    const start = plan.cols + 1
    const crew: Crew = { from: start, to: neighbours(plan, start)[0], t: 0, trail: [] }

    for (let i = 0; i < 200; i += 1) {
      stepCrew(plan, crew, 9, i, random)
      expect(neighbours(plan, crew.from)).toContain(crew.to)
      const p = crewPosition(plan, crew)
      const a = plan.nodes[crew.from]
      const b = plan.nodes[crew.to]
      // Horizontal or vertical segment: the crew is on the line between a and b.
      const onLine =
        Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) < 1e-6 * Math.hypot(b.x - a.x, b.y - a.y) + 1e-3
      expect(onLine).toBe(true)
    }
    expect(crew.trail.length).toBeLessThanOrEqual(90)
  })

  it('walking past lots lights some of them, as worked or corrected', () => {
    const random = seededRandom(5)
    const plan = buildPlan(900, 600, random)
    const crew: Crew = { from: plan.cols + 1, to: plan.cols + 2, t: 0, trail: [] }

    let lit = 0
    for (let i = 0; i < 400; i += 1) lit += stepCrew(plan, crew, 8, i, random)

    expect(lit).toBeGreaterThan(0)
    const states = new Set(plan.lots.filter((l) => l.state !== 'idle').map((l) => l.state))
    expect([...states].every((s) => s === 'worked' || s === 'corrected')).toBe(true)
  })

  it('recycling keeps at most the given share of lots lit, dropping the oldest', () => {
    const plan = buildPlan(900, 600, seededRandom(2))
    plan.lots.forEach((lot, i) => {
      lot.state = 'worked'
      lot.since = i
    })

    recycleLots(plan, 0.25)

    const lit = plan.lots.filter((l) => l.state !== 'idle')
    expect(lit.length).toBe(Math.floor(plan.lots.length * 0.25))
    const newest = plan.lots[plan.lots.length - 1]
    expect(newest.state).toBe('worked')
    expect(plan.lots[0].state).toBe('idle')
  })

  it('prelight lights a share of lots for the static frame', () => {
    const plan = buildPlan(900, 600, seededRandom(9))
    prelight(plan, 0.2, seededRandom(9))
    const ratio = plan.lots.filter((l) => l.state !== 'idle').length / plan.lots.length
    expect(ratio).toBeGreaterThan(0.05)
    expect(ratio).toBeLessThan(0.4)
  })
})
