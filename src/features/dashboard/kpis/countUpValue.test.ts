import { describe, expect, it } from 'vitest'
import { countUpValue } from './countUpValue'

describe('countUpValue', () => {
  it('starts at the previous value and ends exactly at the new one', () => {
    expect(countUpValue(0, 3446, 0)).toBe(0)
    expect(countUpValue(0, 3446, 1)).toBe(3446)
  })

  it('never goes negative when the frame clock is behind the start', () => {
    expect(countUpValue(0, 3446, -0.26)).toBe(0)
    expect(countUpValue(10, 5, -1)).toBe(10)
  })

  it('grows monotonically in between', () => {
    const samples = [0.1, 0.25, 0.5, 0.75, 0.9].map((progress) => countUpValue(0, 100, progress))

    expect(samples).toEqual([...samples].sort((a, b) => a - b))
    expect(samples[2]).toBeGreaterThan(50)
  })

  it('treats a non-finite progress as finished', () => {
    expect(countUpValue(0, 100, Number.NaN)).toBe(100)
  })
})
