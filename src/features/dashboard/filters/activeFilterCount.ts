import { lockedLevels, LEVEL_FILTER_KEY, type CascadeLevel } from '@/domain/cascade'
import type { Alcance, Filters } from '@/domain/types'

/** Filters the user set, not the ones its scope fixed: those never count as "active". */
export function activeFilterCount(filters: Filters, alcance: Alcance): number {
  const locked = new Set<keyof Filters>(lockedLevels(alcance).map((level: CascadeLevel) => LEVEL_FILTER_KEY[level]))
  const keys: Array<keyof Filters> = [
    'departamentoId',
    'ugestionId',
    'ciudadId',
    'sucursalId',
    'filial',
    'zona',
    'ruta',
    'usuario',
    'tipoCambio',
  ]

  return keys.filter((key) => !locked.has(key) && Boolean(filters[key])).length
}
