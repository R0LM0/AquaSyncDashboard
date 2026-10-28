/** Eased counter value: clamped, so a skewed clock can never go negative. */
export function countUpValue(from: number, to: number, progress: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 1))
  const eased = 1 - (1 - clamped) ** 3
  return from + (to - from) * eased
}
