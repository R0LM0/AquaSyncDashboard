import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'aquasync.theme'

/** Stored choice wins; otherwise follow the system. */
export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export function readStoredTheme(storage: Storage = localStorage): string | null {
  try {
    return storage.getItem(THEME_KEY)
  } catch {
    return null
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false
    return resolveInitialTheme(readStoredTheme(), prefersDark)
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        /* private mode: the choice just does not persist */
      }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
