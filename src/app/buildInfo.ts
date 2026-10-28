/**
 * Version stamp injected by vite.config.ts at build time (package.json
 * version, short git commit, build date). Shown in the login and the sidebar
 * so anyone can tell which build is deployed and whether the cache refreshed.
 */
export interface BuildInfo {
  version: string
  commit: string
  builtAt: string
}

export const buildInfo: BuildInfo = {
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0',
  commit: typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : '',
  builtAt: typeof __APP_BUILT_AT__ === 'string' ? __APP_BUILT_AT__ : new Date().toISOString(),
}

export function formatBuildInfo(info: BuildInfo): string {
  const date = info.builtAt.slice(0, 10)
  return [`v${info.version}`, info.commit, date].filter(Boolean).join(' · ')
}
