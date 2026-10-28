import type { Catalogs, Filters } from './types'

/**
 * Cascading catalogs: a child select only offers the options whose parent is
 * selected in the current filters.
 */
export function narrowCatalogs(catalogs: Catalogs, filters: Filters): Catalogs {
  const sucursales = filters.ugestionId
    ? catalogs.sucursales.filter((option) => option.ugestionId === filters.ugestionId)
    : catalogs.sucursales

  const zonas = filters.filial
    ? catalogs.zonas.filter((option) => option.filial === filters.filial)
    : catalogs.zonas

  const rutas = catalogs.rutas.filter(
    (option) =>
      (!filters.filial || option.filial === filters.filial) &&
      (!filters.zona || option.zona === filters.zona),
  )

  return {
    ...catalogs,
    sucursales,
    zonas,
    rutas,
  }
}

/**
 * Drops selections whose parent is no longer valid, so a change of gestión or
 * filial never keeps a stale child filter alive.
 */
export function sanitizeFilters(filters: Filters, catalogs: Catalogs): Filters {
  const narrowed = narrowCatalogs(catalogs, filters)
  const next: Filters = { ...filters }

  if (next.sucursalId && !narrowed.sucursales.some((option) => option.id === next.sucursalId)) {
    delete next.sucursalId
  }
  if (next.filial && !catalogs.filiales.some((option) => option.nombre === next.filial)) {
    delete next.filial
  }
  if (next.zona && !narrowed.zonas.some((option) => option.nombre === next.zona)) {
    delete next.zona
  }
  if (next.ruta && !narrowed.rutas.some((option) => option.nombre === next.ruta)) {
    delete next.ruta
  }
  if (next.usuario && !catalogs.usuarios.some((option) => option.id === next.usuario)) {
    delete next.usuario
  }

  return next
}
