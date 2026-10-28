import type { Filters } from '@/domain/types'

/**
 * The active filters are kept out of the address bar: they live in this tab's
 * sessionStorage, so a reload keeps the view but the URL only shows the section.
 */
export const FILTERS_STORAGE_KEY = 'aquasync.filtros'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY.test(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

const TEXT_FIELDS = [
  'departamentoId',
  'ugestionId',
  'ciudadId',
  'sucursalId',
  'filial',
  'zona',
  'ruta',
  'usuario',
  'tipoCambio',
] as const

function readStorage(storage: Storage): string | null {
  try {
    return storage.getItem(FILTERS_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Tolerant read: anything malformed is dropped and the defaults apply. */
export function readStoredFilters(storage: Storage = sessionStorage): Partial<Filters> | null {
  const raw = readStorage(storage)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const candidate = parsed as Record<string, unknown>
    const stored: Partial<Filters> = {}

    if (isDateKey(candidate.desde)) stored.desde = candidate.desde
    if (isDateKey(candidate.hasta)) stored.hasta = candidate.hasta

    for (const field of TEXT_FIELDS) {
      const value = candidate[field]
      if (isText(value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic key copy
        ;(stored as Record<string, unknown>)[field] = value
      }
    }

    return stored
  } catch {
    return null
  }
}

export function saveStoredFilters(filters: Filters, storage: Storage = sessionStorage): void {
  try {
    storage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch {
    /* private mode: the filters just do not survive a reload */
  }
}

export function clearStoredFilters(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(FILTERS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Defaults overridden by whatever the tab remembers. */
export function restoreFilters(fallback: Filters, storage: Storage = sessionStorage): Filters {
  const stored = readStoredFilters(storage)
  return stored ? { ...fallback, ...stored } : fallback
}
