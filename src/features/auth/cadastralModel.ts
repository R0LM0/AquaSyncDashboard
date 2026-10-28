/**
 * Pure model of the login backdrop: a cadastral plan of a neighbourhood
 * (blocks split into lots, separated by streets), a field crew walking the
 * streets, and lots that light up as the crew passes. No DOM here, so the
 * behaviour is testable without a canvas.
 */

export type LotState = 'idle' | 'worked' | 'corrected'

export interface Lot {
  x: number
  y: number
  w: number
  h: number
  state: LotState
  /** Time (ms) the lot changed state, used to fade the highlight in. */
  since: number
}

export interface CadastralPlan {
  /** Street intersections, row-major: index = row * cols + col. */
  nodes: { x: number; y: number }[]
  cols: number
  rows: number
  lots: Lot[]
  street: number
}

export interface Crew {
  from: number
  to: number
  /** Progress 0..1 between `from` and `to`. */
  t: number
  trail: { x: number; y: number }[]
}

/** Deterministic PRNG so the plan does not jump between renders. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let r = Math.imul(state ^ (state >>> 15), 1 | state)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Builds a slightly irregular street grid that covers `width` x `height` and
 * splits every block into 2–4 x 2 lots, like a cadastral sheet.
 */
export function buildPlan(width: number, height: number, random: () => number): CadastralPlan {
  const street = 14
  const block = Math.max(90, Math.min(150, Math.round(Math.min(width, height) / 6)))
  const cols = Math.ceil(width / block) + 2
  const rows = Math.ceil(height / block) + 2

  const xs: number[] = []
  for (let c = 0; c < cols; c += 1) xs.push((c - 1) * block + (random() - 0.5) * block * 0.18)
  const ys: number[] = []
  for (let r = 0; r < rows; r += 1) ys.push((r - 1) * block + (random() - 0.5) * block * 0.18)

  const nodes: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) nodes.push({ x: xs[c], y: ys[r] })
  }

  const lots: Lot[] = []
  const gap = 3
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const left = xs[c] + street / 2
      const top = ys[r] + street / 2
      const bw = xs[c + 1] - xs[c] - street
      const bh = ys[r + 1] - ys[r] - street
      if (bw < 30 || bh < 30) continue
      const split = 2 + Math.floor(random() * 3)
      const lw = (bw - gap * (split - 1)) / split
      const lh = (bh - gap) / 2
      for (let row = 0; row < 2; row += 1) {
        for (let k = 0; k < split; k += 1) {
          lots.push({
            x: left + k * (lw + gap),
            y: top + row * (lh + gap),
            w: lw,
            h: lh,
            state: 'idle',
            since: 0,
          })
        }
      }
    }
  }

  return { nodes, cols, rows, lots, street }
}

/** Neighbouring intersections along the streets (no diagonals). */
export function neighbours(plan: CadastralPlan, index: number): number[] {
  const c = index % plan.cols
  const r = Math.floor(index / plan.cols)
  const result: number[] = []
  if (c > 0) result.push(index - 1)
  if (c < plan.cols - 1) result.push(index + 1)
  if (r > 0) result.push(index - plan.cols)
  if (r < plan.rows - 1) result.push(index + plan.cols)
  return result
}

/** Picks the next intersection, avoiding an immediate U-turn when possible. */
export function nextNode(plan: CadastralPlan, from: number, to: number, random: () => number): number {
  const options = neighbours(plan, to).filter((n) => n !== from)
  const pool = options.length > 0 ? options : neighbours(plan, to)
  return pool[Math.floor(random() * pool.length)]
}

export function crewPosition(plan: CadastralPlan, crew: Crew): { x: number; y: number } {
  const a = plan.nodes[crew.from]
  const b = plan.nodes[crew.to]
  return { x: a.x + (b.x - a.x) * crew.t, y: a.y + (b.y - a.y) * crew.t }
}

/**
 * Advances the crew `distance` pixels along the streets and lights the lots
 * whose frontage it walks past. Returns how many lots changed state.
 */
export function stepCrew(
  plan: CadastralPlan,
  crew: Crew,
  distance: number,
  now: number,
  random: () => number,
): number {
  let remaining = distance
  while (remaining > 0) {
    const a = plan.nodes[crew.from]
    const b = plan.nodes[crew.to]
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const left = (1 - crew.t) * length
    if (remaining < left) {
      crew.t += remaining / length
      remaining = 0
    } else {
      remaining -= left
      const previous = crew.from
      crew.from = crew.to
      crew.to = nextNode(plan, previous, crew.to, random)
      crew.t = 0
    }
  }

  const position = crewPosition(plan, crew)
  crew.trail.push(position)
  if (crew.trail.length > 90) crew.trail.shift()

  let changed = 0
  const reach = plan.street / 2 + 6
  for (const lot of plan.lots) {
    if (lot.state !== 'idle') continue
    const dx = Math.max(lot.x - position.x, 0, position.x - (lot.x + lot.w))
    const dy = Math.max(lot.y - position.y, 0, position.y - (lot.y + lot.h))
    if (Math.hypot(dx, dy) <= reach && random() < 0.35) {
      lot.state = random() < 0.12 ? 'corrected' : 'worked'
      lot.since = now
      changed += 1
    }
  }
  return changed
}

/** Keeps the plan readable: once too many lots are lit, the oldest go back to idle. */
export function recycleLots(plan: CadastralPlan, maxLitRatio = 0.3): void {
  const lit = plan.lots.filter((lot) => lot.state !== 'idle')
  const limit = Math.floor(plan.lots.length * maxLitRatio)
  if (lit.length <= limit) return
  lit.sort((a, b) => a.since - b.since)
  for (const lot of lit.slice(0, lit.length - limit)) {
    lot.state = 'idle'
    lot.since = 0
  }
}

/** Lights a share of lots up front, for the static (reduced-motion) frame. */
export function prelight(plan: CadastralPlan, share: number, random: () => number): void {
  for (const lot of plan.lots) {
    if (random() < share) {
      lot.state = random() < 0.12 ? 'corrected' : 'worked'
      lot.since = -1e9
    }
  }
}
