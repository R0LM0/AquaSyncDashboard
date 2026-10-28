import type { Filters } from '@/domain/types'

export function activeFilterCount(filters: Filters): number {
  return (
    [filters.ugestionId, filters.sucursalId, filters.filial, filters.zona, filters.ruta, filters.usuario].filter(
      Boolean,
    ).length + (filters.tipoCambio ? 1 : 0)
  )
}
