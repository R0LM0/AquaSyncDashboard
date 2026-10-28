export type RuntimeEnvironment = 'produccion' | 'pruebas'

/** Where the chosen environment is remembered between visits. */
export const RUNTIME_ENV_KEY = 'aquasync.ambiente'

/** One production build, two API ports on the same host. */
export const ENVIRONMENT_PORTS: Record<RuntimeEnvironment, string> = {
  produccion: '8070',
  pruebas: '7050',
}

export const ENVIRONMENT_LABELS: Record<RuntimeEnvironment, string> = {
  produccion: 'PRODUCCIÓN',
  pruebas: 'PRUEBAS',
}

export const DEFAULT_RUNTIME_ENVIRONMENT: RuntimeEnvironment = 'produccion'

export interface SwitchableEnv {
  MODE: string
  VITE_API_MODE?: string
  VITE_API_URL?: string
}

/**
 * Only the production build switches at runtime. Mock (dev), the local API and
 * the test build keep their fixed target, exactly as before.
 */
export function isEnvironmentSwitchable(env: SwitchableEnv): boolean {
  return env.MODE === 'production' && env.VITE_API_MODE === 'http' && !env.VITE_API_URL
}

/** The environment that applies when nobody chose one. */
export function defaultRuntimeEnvironment(env: SwitchableEnv): RuntimeEnvironment {
  if (isEnvironmentSwitchable(env)) return DEFAULT_RUNTIME_ENVIRONMENT
  return env.MODE === 'test' ? 'pruebas' : DEFAULT_RUNTIME_ENVIRONMENT
}

export function readRuntimeEnvironment(storage: Storage = localStorage): RuntimeEnvironment {
  try {
    const stored = storage.getItem(RUNTIME_ENV_KEY)
    return stored === 'pruebas' || stored === 'produccion' ? stored : DEFAULT_RUNTIME_ENVIRONMENT
  } catch {
    return DEFAULT_RUNTIME_ENVIRONMENT
  }
}

export function saveRuntimeEnvironment(
  environment: RuntimeEnvironment,
  storage: Storage = localStorage,
): void {
  try {
    storage.setItem(RUNTIME_ENV_KEY, environment)
  } catch {
    /* private mode: the choice just does not persist */
  }
}

/** Resolves what the running app must use right now. */
export function resolveRuntimeEnvironment(env: SwitchableEnv): RuntimeEnvironment {
  if (!isEnvironmentSwitchable(env)) return defaultRuntimeEnvironment(env)
  return readRuntimeEnvironment()
}

/** The amber band only belongs to the test environment. */
export function showsTestDataBand(environment: RuntimeEnvironment): boolean {
  return environment === 'pruebas'
}
