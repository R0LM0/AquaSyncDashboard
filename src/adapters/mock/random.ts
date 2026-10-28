/** Deterministic pseudo-random generator (mulberry32) so mock data is stable. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

/** Picks a key from a weight table (weights do not need to add up to 1). */
export function weightedPick<T extends string>(
  random: () => number,
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((acc, [, weight]) => acc + weight, 0)
  let threshold = random() * total
  for (const [key, weight] of entries) {
    threshold -= weight
    if (threshold <= 0) return key
  }
  return entries[entries.length - 1][0]
}
