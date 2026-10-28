import type { Alcance, CatalogOption, Filters } from './types'

/**
 * The filter levels in SIGIL order. Each level is loaded from its cascade endpoint
 * once its parent is chosen; choosing a level clears every level below it.
 */
export const CASCADE_LEVELS = [
  'departamento',
  'ugestion',
  'ciudad',
  'sucursal',
  'filial',
  'zona',
  'ruta',
] as const

export type CascadeLevel = (typeof CASCADE_LEVELS)[number]

/** The parents a cascade endpoint needs, keyed the way the API names them. */
export interface CascadeParents {
  dptoId?: string
  ugestionId?: string
  ciudadId?: string
  sucursalId?: string
  filial?: string
  zona?: string
}

/** Filter key that holds the value of each level. */
export const LEVEL_FILTER_KEY: Record<CascadeLevel, keyof Filters> = {
  departamento: 'departamentoId',
  ugestion: 'ugestionId',
  ciudad: 'ciudadId',
  sucursal: 'sucursalId',
  filial: 'filial',
  zona: 'zona',
  ruta: 'ruta',
}

interface Chain {
  dptoId: string
  ugestionId: string
  ciudadId: string
  sucursalId: string
}

/**
 * Parents of a level, or `null` while the level cannot load yet (its parent is
 * not chosen, or it is "Todas"). A filial needs the whole chain: the endpoint
 * takes dptoId, ugestionId, ciudadId and sucursalId.
 */
export function cascadeParents(level: CascadeLevel, filters: Filters): CascadeParents | null {
  switch (level) {
    case 'departamento':
      return {}
    case 'ugestion':
      return filters.departamentoId ? { dptoId: filters.departamentoId } : null
    case 'ciudad':
      return filters.ugestionId ? { ugestionId: filters.ugestionId } : null
    case 'sucursal':
      return filters.ciudadId ? { ciudadId: filters.ciudadId } : null
    case 'filial':
      return chainOf(filters)
    case 'zona':
      return chainOf(filters) && filters.filial ? { ...chainOf(filters), filial: filters.filial } : null
    case 'ruta':
      return chainOf(filters) && filters.filial && filters.zona
        ? { ...chainOf(filters), filial: filters.filial, zona: filters.zona }
        : null
  }
}

function chainOf(filters: Filters): Chain | null {
  const { departamentoId, ugestionId, ciudadId, sucursalId } = filters
  if (!departamentoId || !ugestionId || !ciudadId || !sucursalId) return null
  return { dptoId: departamentoId, ugestionId, ciudadId, sucursalId }
}

/**
 * Applies a patch of filters. Changing a cascade level clears every level below it,
 * so no child filter outlives its parent. The scope is enforced after the patch.
 */
export function applyFilterPatch(filters: Filters, patch: Partial<Filters>, alcance: Alcance): Filters {
  const next: Filters = { ...filters, ...patch }

  CASCADE_LEVELS.forEach((level, index) => {
    const key = LEVEL_FILTER_KEY[level]
    if (!(key in patch) || patch[key] === filters[key]) return

    for (const below of CASCADE_LEVELS.slice(index + 1)) {
      delete next[LEVEL_FILTER_KEY[below]]
    }
  })

  return scopedFilters(next, alcance)
}

/** Forces the scope onto the filters: a restricted user cannot leave its unidad. */
export function scopedFilters(filters: Filters, alcance: Alcance): Filters {
  if (alcance.pais) return { ...filters }

  const next: Filters = { ...filters }
  if (alcance.dptoId) next.departamentoId = alcance.dptoId
  if (alcance.ugestionId) next.ugestionId = alcance.ugestionId

  if (next.sucursalId && alcance.sucursales.length > 0 && !alcance.sucursales.includes(next.sucursalId)) {
    delete next.sucursalId
  }

  return next
}

/** Levels fixed by the scope: shown locked, never changed by the user. */
export function lockedLevels(alcance: Alcance): CascadeLevel[] {
  if (alcance.pais) return []
  const levels: CascadeLevel[] = []
  if (alcance.dptoId) levels.push('departamento')
  if (alcance.ugestionId) levels.push('ugestion')
  return levels
}

/** A restricted user with a sucursal list is offered only those sucursales. */
export function sucursalOptionsForScope(options: CatalogOption[], alcance: Alcance): CatalogOption[] {
  if (alcance.pais || alcance.sucursales.length === 0) return options
  return options.filter((option) => alcance.sucursales.includes(option.id))
}
