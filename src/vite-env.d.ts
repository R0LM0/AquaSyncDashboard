/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: 'mock' | 'http'
  /** Optional full base URL override (local API). */
  readonly VITE_API_URL?: string
  /** Port of the API on the same host that serves this dashboard. */
  readonly VITE_API_PORT?: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Build stamp injected by vite.config.ts (see src/app/buildInfo.ts). */
declare const __APP_VERSION__: string
declare const __APP_COMMIT__: string
declare const __APP_BUILT_AT__: string
