import { describe, expect, it } from 'vitest'
import { resolveApiUrl } from './apiUrl'
import {
  defaultRuntimeEnvironment,
  ENVIRONMENT_PORTS,
  isEnvironmentSwitchable,
  RUNTIME_ENV_KEY,
  readRuntimeEnvironment,
  saveRuntimeEnvironment,
  showsTestDataBand,
} from './runtimeEnvironment'

const PROD_BUILD = { MODE: 'production', VITE_API_MODE: 'http' as const }
const LOCATION = { protocol: 'http:', hostname: '192.168.1.15' }

describe('environment switching', () => {
  it('only the production build can switch', () => {
    expect(isEnvironmentSwitchable(PROD_BUILD)).toBe(true)
    expect(isEnvironmentSwitchable({ MODE: 'test', VITE_API_MODE: 'http' })).toBe(false)
    expect(isEnvironmentSwitchable({ MODE: 'development', VITE_API_MODE: 'mock' })).toBe(false)
    expect(isEnvironmentSwitchable({ MODE: 'localapi', VITE_API_MODE: 'http' })).toBe(false)
    expect(
      isEnvironmentSwitchable({
        MODE: 'production',
        VITE_API_MODE: 'http',
        VITE_API_URL: 'http://localhost:5029/',
      }),
    ).toBe(false)
  })

  it('defaults to production, and to test in the test build', () => {
    expect(defaultRuntimeEnvironment(PROD_BUILD)).toBe('produccion')
    expect(defaultRuntimeEnvironment({ MODE: 'test', VITE_API_MODE: 'http' })).toBe('pruebas')
    expect(defaultRuntimeEnvironment({ MODE: 'development', VITE_API_MODE: 'mock' })).toBe(
      'produccion',
    )
  })

  it('remembers the chosen environment', () => {
    const storage = new Map<string, string>()
    const fake = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    } as unknown as Storage

    expect(readRuntimeEnvironment(fake)).toBe('produccion')

    saveRuntimeEnvironment('pruebas', fake)
    expect(storage.get(RUNTIME_ENV_KEY)).toBe('pruebas')
    expect(readRuntimeEnvironment(fake)).toBe('pruebas')

    saveRuntimeEnvironment('produccion', fake)
    expect(readRuntimeEnvironment(fake)).toBe('produccion')
  })

  it('ignores a corrupted stored value', () => {
    const fake = {
      getItem: () => 'qa',
      setItem: () => undefined,
      removeItem: () => undefined,
    } as unknown as Storage

    expect(readRuntimeEnvironment(fake)).toBe('produccion')
  })

  it('shows the amber band only for the test environment', () => {
    expect(showsTestDataBand('pruebas')).toBe(true)
    expect(showsTestDataBand('produccion')).toBe(false)
  })
})

describe('api url from the runtime environment', () => {
  it('switches the port between 8070 and 7050 on the same host', () => {
    expect(resolveApiUrl(LOCATION, PROD_BUILD, 'produccion')).toBe('http://192.168.1.15:8070/')
    expect(resolveApiUrl(LOCATION, PROD_BUILD, 'pruebas')).toBe('http://192.168.1.15:7050/')
    expect(ENVIRONMENT_PORTS).toEqual({ produccion: '8070', pruebas: '7050' })
  })

  it('keeps the fixed port outside a switchable build', () => {
    expect(
      resolveApiUrl(LOCATION, { MODE: 'test', VITE_API_MODE: 'http', VITE_API_PORT: '7050' }, 'produccion'),
    ).toBe('http://192.168.1.15:7050/')
  })

  it('lets VITE_API_URL win over the switch', () => {
    expect(
      resolveApiUrl(
        { protocol: 'http:', hostname: 'localhost' },
        { MODE: 'production', VITE_API_MODE: 'http', VITE_API_URL: 'http://localhost:5029/' },
        'pruebas',
      ),
    ).toBe('http://localhost:5029/')
  })
})
