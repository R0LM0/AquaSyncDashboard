import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { ChangeType, DailyProgress } from '@/domain/types'

export interface ChangeTypeSlice {
  tipo: ChangeType
  label: string
  value: number
  color: string
}

/** One slice per change type, always in the same order and colors. */
export function changeTypeSlices(daily: DailyProgress[]): ChangeTypeSlice[] {
  const totals = new Map<ChangeType, number>()
  for (const row of daily) totals.set(row.tipoCambio, (totals.get(row.tipoCambio) ?? 0) + row.cambios)

  return CHANGE_TYPES.map((tipo) => ({
    tipo,
    label: CHANGE_TYPE_LABELS[tipo],
    value: totals.get(tipo) ?? 0,
    color: CHANGE_TYPE_COLORS[tipo],
  })).filter((slice) => slice.value > 0)
}
