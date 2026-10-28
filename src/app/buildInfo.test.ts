import { describe, expect, it } from 'vitest'
import { formatBuildInfo } from './buildInfo'

describe('build info', () => {
  it('shows version, short commit and build date in a readable line', () => {
    expect(
      formatBuildInfo({ version: '1.0.0', commit: 'a1b2c3d', builtAt: '2026-10-28T02:15:00.000Z' }),
    ).toBe('v1.0.0 · a1b2c3d · 2026-10-28')
  })

  it('omits the commit when the build was not made from git', () => {
    expect(formatBuildInfo({ version: '1.0.0', commit: '', builtAt: '2026-10-28T02:15:00.000Z' })).toBe(
      'v1.0.0 · 2026-10-28',
    )
  })
})
