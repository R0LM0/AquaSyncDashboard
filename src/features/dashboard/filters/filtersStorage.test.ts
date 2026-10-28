import { beforeEach, describe, expect, it } from 'vitest'
import type { Filters } from '@/domain/types'
import {
  clearStoredFilters,
  FILTERS_STORAGE_KEY,
  readStoredFilters,
  restoreFilters,
  saveStoredFilters,
} from './filtersStorage'

const defaults: Filters = { desde: '2026-10-26', hasta: '2026-10-28' }

describe('filters out of the URL', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('keeps the filters of this tab and the URL clean', () => {
    const filters: Filters = {
      desde: '2026-10-01',
      hasta: '2026-10-15',
      ruta: '03',
      usuario: 'jmedina',
      tipoCambio: 'FotoNueva',
    }

    saveStoredFilters(filters)

    expect(restoreFilters(defaults)).toEqual(filters)
    expect(window.location.search).toBe('')
  })

  it('falls back to the defaults when the tab has nothing stored', () => {
    expect(readStoredFilters()).toBeNull()
    expect(restoreFilters(defaults)).toEqual(defaults)
  })

  it('ignores a corrupted value', () => {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, '{no es json')

    expect(readStoredFilters()).toBeNull()
    expect(restoreFilters(defaults)).toEqual(defaults)
  })

  it('drops invalid dates and blank fields instead of propagating them', () => {
    sessionStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ desde: 'ayer', hasta: '2026-10-15', ruta: '', usuario: 'jmedina', otro: 1 }),
    )

    expect(readStoredFilters()).toEqual({ hasta: '2026-10-15', usuario: 'jmedina' })
  })

  it('only overrides the members it knows', () => {
    saveStoredFilters({ desde: '2026-10-01', hasta: '2026-10-02', filial: '01' })

    expect(restoreFilters({ ...defaults, zona: '02' })).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-02',
      zona: '02',
      filial: '01',
    })
  })

  it('can be cleared', () => {
    saveStoredFilters(defaults)
    clearStoredFilters()

    expect(readStoredFilters()).toBeNull()
  })
})
