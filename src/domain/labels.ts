import type { ChangeType } from './types'

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  FotoNueva: 'Foto nueva',
  FotoActualizada: 'Foto actualizada',
  UbicacionNueva: 'Ubicación nueva',
  UbicacionCorregida: 'Ubicación corregida',
}

/** One color per change type, shared by charts, legends and map markers. */
export const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  FotoNueva: '#1d6fb8',
  FotoActualizada: '#2f9e8f',
  UbicacionNueva: '#c98a12',
  UbicacionCorregida: '#8d5bd4',
}

export const CHANGE_TYPES: readonly ChangeType[] = [
  'FotoNueva',
  'FotoActualizada',
  'UbicacionNueva',
  'UbicacionCorregida',
]
