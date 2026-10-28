import { CHANGE_TYPE_LABELS } from '../../../domain/labels'
import type { ChangeRow, Filters, Summary } from '../../../domain/types'
import { formatDateTime, formatPercent } from '../../../shared/format'

export interface Sheet {
  name: string
  header: string[]
  rows: Array<Array<string | number>>
}

const CHANGE_HEADER = [
  'Fecha',
  'Usuario',
  'Cuenta',
  'Cliente',
  'Filial',
  'Zona',
  'Ruta',
  'Tipo de cambio',
  'Origen',
]

/** Pure: the sheet is exactly the filtered detail rows, in the same order. */
export function buildChangeSheet(rows: ChangeRow[]): Sheet {
  return {
    name: 'Cambios',
    header: CHANGE_HEADER,
    rows: rows.map((row) => [
      formatDateTime(row.fecha),
      row.usuario,
      row.cuenta,
      row.cliente,
      row.filial,
      row.zona,
      row.ruta,
      CHANGE_TYPE_LABELS[row.tipoCambio],
      row.origen,
    ]),
  }
}

/** Pure: the applied filters plus every summary metric. */
export function buildSummarySheet(summary: Summary, filters: Filters): Sheet {
  const filterLines: Array<[string, string]> = [
    ['Unidad de gestión', filters.ugestionId ?? 'Todas'],
    ['Sucursal', filters.sucursalId ?? 'Todas'],
    ['Filial', filters.filial ?? 'Todas'],
    ['Zona', filters.zona ?? 'Todas'],
    ['Ruta', filters.ruta ?? 'Todas'],
    ['Usuario', filters.usuario ?? 'Todos'],
    ['Desde', filters.desde],
    ['Hasta', filters.hasta],
    ['Tipo de cambio', filters.tipoCambio ? CHANGE_TYPE_LABELS[filters.tipoCambio] : 'Todos'],
  ]

  return {
    name: 'Resumen',
    header: ['Concepto', 'Valor'],
    rows: [
      ['Cuentas trabajadas', summary.cuentasTrabajadas],
      ['Fotos nuevas', summary.fotosNuevas],
      ['Fotos actualizadas', summary.fotosActualizadas],
      ['Ubicaciones', summary.ubicaciones],
      ['Usuarios activos', summary.usuariosActivos],
      ['Avance de ruta', summary.avanceRutaPct ?? ''],
      ...filterLines.map(([label, value]) => [`Filtro: ${label}`, value] as [string, string]),
    ],
  }
}

export function filtersSummaryText(filters: Filters): string {
  const parts = [
    `Período ${filters.desde} a ${filters.hasta}`,
    filters.filial ? `Filial ${filters.filial}` : undefined,
    filters.zona ? `Zona ${filters.zona}` : undefined,
    filters.ruta ? `Ruta ${filters.ruta}` : undefined,
    filters.usuario ? `Usuario ${filters.usuario}` : undefined,
  ].filter(Boolean)

  return parts.join(' · ')
}

export function percentText(value: number): string {
  return formatPercent(value)
}
