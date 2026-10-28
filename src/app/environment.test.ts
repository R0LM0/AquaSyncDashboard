import { describe, expect, it } from 'vitest'
import { describeEnvironment } from './environment'

const PROD_API = 'http://192.168.1.15:8070/'
const TEST_API = 'http://192.168.1.15:7050/'
const LOCAL_API = 'http://localhost:5029/'

describe('describeEnvironment', () => {
  it('labels production in green and shows the resolved host', () => {
    const info = describeEnvironment({ MODE: 'production', VITE_API_MODE: 'http' }, PROD_API)

    expect(info.label).toBe('PRODUCCIÓN')
    expect(info.tone).toBe('success')
    expect(info.detail).toBe('192.168.1.15:8070')
  })

  it('labels the test build in amber with its own port', () => {
    const info = describeEnvironment({ MODE: 'test', VITE_API_MODE: 'http' }, TEST_API)

    expect(info.label).toBe('PRUEBAS')
    expect(info.tone).toBe('warning')
    expect(info.detail).toBe('192.168.1.15:7050')
  })

  it('labels a local API in blue', () => {
    const info = describeEnvironment({ MODE: 'localapi', VITE_API_MODE: 'http' }, LOCAL_API)

    expect(info.label).toBe('LOCAL')
    expect(info.tone).toBe('info')
    expect(info.detail).toBe('localhost:5029')
  })

  it('labels simulated data in violet', () => {
    const info = describeEnvironment({ MODE: 'development', VITE_API_MODE: 'mock' }, PROD_API)

    expect(info.label).toBe('DATOS DE PRUEBA')
    expect(info.tone).toBe('violet')
    expect(info.detail).toContain('simulados')
  })

  it('treats a mock adapter as simulated even in another mode', () => {
    expect(describeEnvironment({ MODE: 'test', VITE_API_MODE: 'mock' }, TEST_API).tone).toBe('violet')
  })
})
