import type { PredioEstado, PredioLayerProperties } from '@/domain/types'

/**
 * Single source of the predio colours. The account states use the mobile palette
 * (Barrido lib/models/ruta_predio_style.dart); "trabajado" uses the dashboard aqua.
 */
export interface PredioEstadoStyle {
  label: string
  fill: string
  fillOpacity: number
  stroke: string
}

export const PREDIO_ESTADO_STYLES: Record<PredioEstado, PredioEstadoStyle> = {
  trabajado: {
    label: 'Trabajado en el período',
    fill: '#2ED4EA',
    fillOpacity: 0.45,
    stroke: '#09798F',
  },
  vinculado: {
    label: 'Cuenta vinculada',
    fill: '#2EAD58',
    fillOpacity: 0.36,
    stroke: '#146B31',
  },
  sin_ubicacion: {
    label: 'Cuenta sin ubicación',
    fill: '#EE8D23',
    fillOpacity: 0.36,
    stroke: '#995010',
  },
  sin_asociacion: {
    label: 'Sin cuenta asociada',
    fill: '#87909A',
    fillOpacity: 0.36,
    stroke: '#444C56',
  },
}

/** Legend and popup order: worked first, then the account states. */
export const PREDIO_ESTADOS_ORDER: readonly PredioEstado[] = [
  'trabajado',
  'vinculado',
  'sin_ubicacion',
  'sin_asociacion',
]

export function predioEstadoLabel(estado: PredioEstado): string {
  return PREDIO_ESTADO_STYLES[estado].label
}

/** The state of a predio feature; one without a known state reads as "sin cuenta asociada". */
export function estadoOfProperties(properties: Partial<Pick<PredioLayerProperties, 'estado'>> | null | undefined): PredioEstado {
  const estado = properties?.estado
  return estado && estado in PREDIO_ESTADO_STYLES ? estado : 'sin_asociacion'
}

/** The Leaflet path style of a predio, from the single source above. */
export function predioPathStyle(estado: PredioEstado) {
  const style = PREDIO_ESTADO_STYLES[estado]
  return {
    color: style.stroke,
    weight: 1.2,
    fillColor: style.fill,
    fillOpacity: style.fillOpacity,
  }
}
