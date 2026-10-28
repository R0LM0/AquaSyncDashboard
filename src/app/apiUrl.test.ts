import { describe, expect, it } from 'vitest'
import { resolveApiUrl } from './apiUrl'

const LOCAL = { protocol: 'http:', hostname: 'localhost' }

describe('resolveApiUrl', () => {
  it('uses VITE_API_URL as is when it is defined (local mode and overrides)', () => {
    expect(
      resolveApiUrl(LOCAL, { VITE_API_URL: 'http://localhost:5029/', VITE_API_PORT: '8070' }),
    ).toBe('http://localhost:5029/')
  })

  it('completes the trailing slash of an override', () => {
    expect(resolveApiUrl(LOCAL, { VITE_API_URL: 'http://localhost:5029' })).toBe(
      'http://localhost:5029/',
    )
  })

  it('builds from the internal network host and the configured port', () => {
    expect(
      resolveApiUrl({ protocol: 'http:', hostname: '192.168.1.15' }, { VITE_API_PORT: '8070' }),
    ).toBe('http://192.168.1.15:8070/')
  })

  it('builds from the public host', () => {
    expect(
      resolveApiUrl({ protocol: 'http:', hostname: '138.117.6.44' }, { VITE_API_PORT: '8070' }),
    ).toBe('http://138.117.6.44:8070/')
  })

  it('keeps the https scheme', () => {
    expect(
      resolveApiUrl(
        { protocol: 'https:', hostname: 'sigil.enacal.gob.ni' },
        { VITE_API_PORT: '8070' },
      ),
    ).toBe('https://sigil.enacal.gob.ni:8070/')
  })

  it('serves the same host on the default port when no port is configured', () => {
    expect(resolveApiUrl({ protocol: 'http:', hostname: '192.168.1.15' }, {})).toBe(
      'http://192.168.1.15/',
    )
  })
})
