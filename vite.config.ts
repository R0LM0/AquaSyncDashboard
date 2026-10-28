import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')) as {
  version: string
}

/** Short commit of the build, empty when building outside git. */
function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitCommit()),
    __APP_BUILT_AT__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), './src') },
  },
  build: {
    // `npm run build:test` writes dist-test/, `npm run build:prod` writes dist/.
    outDir: mode === 'test' ? 'dist-test' : 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
}))
