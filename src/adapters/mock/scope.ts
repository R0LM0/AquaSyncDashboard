import { scopedFilters, type CascadeParents, type CascadeLevel } from '../../domain/cascade'
import { ForbiddenError } from '../../domain/errors'
import type { Alcance, CatalogOption, Catalogs, Filters } from '../../domain/types'
import { CIUDADES, DEPARTAMENTOS, rutaSucursal, SUCURSAL_CIUDAD, UG_DEPARTAMENTO } from './data'

/** Mock of the server rule: a request outside the user's scope is 403, never a silent empty. */
export function assertWithinScope(
  ids: Pick<CascadeParents, 'dptoId' | 'ugestionId' | 'sucursalId'>,
  scope: Alcance,
): void {
  if (scope.pais) return
  if (ids.dptoId && ids.dptoId !== scope.dptoId) throw new ForbiddenError('No tiene acceso a ese departamento')
  if (ids.ugestionId && ids.ugestionId !== scope.ugestionId) {
    throw new ForbiddenError('No tiene acceso a esa unidad de gestión')
  }
  if (ids.sucursalId && scope.sucursales.length > 0 && !scope.sucursales.includes(ids.sucursalId)) {
    throw new ForbiddenError('No tiene acceso a esa sucursal')
  }
}

/** Report filters: outside the scope is refused, an empty level is forced to the scope. */
export function enforceScope(filters: Filters, scope: Alcance): Filters {
  assertWithinScope(
    { dptoId: filters.departamentoId, ugestionId: filters.ugestionId, sucursalId: filters.sucursalId },
    scope,
  )
  return scopedFilters(filters, scope)
}

function unique(options: CatalogOption[]): CatalogOption[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    if (seen.has(option.id)) return false
    seen.add(option.id)
    return true
  })
}

/** One level of the mock cascade, derived from the same tables the report reads. */
export function cascadeOptions(
  catalogs: Catalogs,
  scope: Alcance,
  level: CascadeLevel,
  parents: CascadeParents,
): CatalogOption[] {
  assertWithinScope(parents, scope)
  const inUnidad = (ugestionId: string) => scope.pais || ugestionId === scope.ugestionId

  switch (level) {
    case 'departamento':
      return DEPARTAMENTOS.filter((dpto) => scope.pais || dpto.id === scope.dptoId)
    case 'ugestion':
      return catalogs.ugestiones.filter(
        (ugestion) => UG_DEPARTAMENTO[ugestion.id] === parents.dptoId && inUnidad(ugestion.id),
      )
    case 'ciudad':
      return CIUDADES.filter((ciudad) => ciudad.ugestionId === parents.ugestionId && inUnidad(ciudad.ugestionId))
    case 'sucursal':
      return catalogs.sucursales.filter(
        (sucursal) =>
          SUCURSAL_CIUDAD[sucursal.id] === parents.ciudadId &&
          inUnidad(sucursal.ugestionId) &&
          (scope.pais || scope.sucursales.length === 0 || scope.sucursales.includes(sucursal.id)),
      )
    case 'filial':
    case 'zona':
    case 'ruta': {
      const routes = catalogs.rutas.filter(
        (ruta) =>
          rutaSucursal[ruta.id] === parents.sucursalId &&
          (level === 'filial' || ruta.filial === parents.filial) &&
          (level !== 'ruta' || ruta.zona === parents.zona),
      )
      if (level === 'filial') return unique(routes.map((ruta) => ({ id: ruta.filial, nombre: ruta.filial })))
      if (level === 'zona') return unique(routes.map((ruta) => ({ id: ruta.zona, nombre: ruta.zona })))
      // Rutas are identified by their SIGIL name, as the report filter and the API expect.
      return routes.map((ruta) => ({ id: ruta.nombre, nombre: ruta.nombre }))
    }
  }
}
