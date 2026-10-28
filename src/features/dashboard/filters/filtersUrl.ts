import type { ChangeType, Filters } from '../../../domain/types'

const CHANGE_TYPES: readonly ChangeType[] = [
  'FotoNueva',
  'FotoActualizada',
  'UbicacionNueva',
  'UbicacionCorregida',
]

const PARAM_KEYS: ReadonlyArray<[keyof Filters, string]> = [
  ['desde', 'desde'],
  ['hasta', 'hasta'],
  ['tipoCambio', 'tipo'],
  ['ugestionId', 'ugestion'],
  ['sucursalId', 'sucursal'],
  ['filial', 'filial'],
  ['zona', 'zona'],
  ['ruta', 'ruta'],
  ['usuario', 'usuario'],
]

export interface DefaultRange {
  desde: string
  hasta: string
}

/** Filters -> query string parameters, dropping the ones without a value. */
export function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams()

  for (const [field, param] of PARAM_KEYS) {
    const value = filters[field]
    if (typeof value === 'string' && value !== '') params.set(param, value)
  }

  return params
}

/** Query string parameters -> filters, falling back to the default date range. */
export function paramsToFilters(params: URLSearchParams, fallback: DefaultRange): Filters {
  const filters: Filters = {
    desde: params.get('desde') || fallback.desde,
    hasta: params.get('hasta') || fallback.hasta,
  }

  const tipo = params.get('tipo')
  if (tipo && (CHANGE_TYPES as readonly string[]).includes(tipo)) {
    filters.tipoCambio = tipo as ChangeType
  }

  const textFields: ReadonlyArray<[keyof Filters, string]> = [
    ['ugestionId', 'ugestion'],
    ['sucursalId', 'sucursal'],
    ['filial', 'filial'],
    ['zona', 'zona'],
    ['ruta', 'ruta'],
    ['usuario', 'usuario'],
  ]

  for (const [field, param] of textFields) {
    const value = params.get(param)
    if (value) {
      filters[field] = value as never
    }
  }

  return filters
}

export function filtersToQuery(filters: Filters): string {
  const query = filtersToParams(filters).toString()
  return query ? `?${query}` : ''
}

export function readFiltersFromLocation(location: Location, fallback: DefaultRange): Filters {
  return paramsToFilters(new URLSearchParams(location.search), fallback)
}

export function isChangeType(value: string): value is ChangeType {
  return (CHANGE_TYPES as readonly string[]).includes(value)
}
