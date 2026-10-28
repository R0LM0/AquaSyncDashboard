import { useEffect, useState } from 'react'
import { cascadeParents, type CascadeLevel } from '@/domain/cascade'
import { isSessionExpired } from '@/domain/errors'
import type { CatalogOption, Filters } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'

export type CascadeOptions = Record<CascadeLevel, CatalogOption[]>

interface LevelState {
  /** The parents the items were loaded for: stale answers never reach the select. */
  key: string
  items: CatalogOption[]
}

/**
 * The options of every cascade level for the current filters. A level is loaded
 * when its parents are chosen; until then it has no options.
 */
export function useCascadeOptions(
  api: DashboardApi,
  filters: Filters,
  onSessionExpired?: () => void,
): CascadeOptions {
  return {
    departamento: useLevelOptions(api, 'departamento', filters, onSessionExpired),
    ugestion: useLevelOptions(api, 'ugestion', filters, onSessionExpired),
    ciudad: useLevelOptions(api, 'ciudad', filters, onSessionExpired),
    sucursal: useLevelOptions(api, 'sucursal', filters, onSessionExpired),
    filial: useLevelOptions(api, 'filial', filters, onSessionExpired),
    zona: useLevelOptions(api, 'zona', filters, onSessionExpired),
    ruta: useLevelOptions(api, 'ruta', filters, onSessionExpired),
  }
}

function useLevelOptions(
  api: DashboardApi,
  level: CascadeLevel,
  filters: Filters,
  onSessionExpired?: () => void,
): CatalogOption[] {
  const parents = cascadeParents(level, filters)
  const parentsKey = parents === null ? null : JSON.stringify(parents)
  const [loaded, setLoaded] = useState<LevelState | null>(null)

  useEffect(() => {
    if (parentsKey === null) return

    let cancelled = false
    api
      .cascade(level, JSON.parse(parentsKey) as Record<string, string>)
      .then((items) => {
        if (!cancelled) setLoaded({ key: parentsKey, items })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (isSessionExpired(error)) onSessionExpired?.()
        else setLoaded({ key: parentsKey, items: [] })
      })

    return () => {
      cancelled = true
    }
  }, [api, level, parentsKey, onSessionExpired])

  return parentsKey !== null && loaded?.key === parentsKey ? loaded.items : []
}
