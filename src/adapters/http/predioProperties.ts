import type { PredioEstado, PredioLayerProperties } from '@/domain/types'

/** Raw predio properties: SIGIL may send lot/block codes as numbers and surfaces as null. */
export interface RawPredioProperties {
  id: number
  idPredio: number
  nroLote: string | number | null | undefined
  idManzana: string | number | null | undefined
  idUgestion: number
  idSucursal: number
  supTerreno: number | null | undefined
  supConst: number | null | undefined
  estado?: string | null
}

const PREDIO_ESTADOS: readonly PredioEstado[] = ['trabajado', 'vinculado', 'sin_ubicacion', 'sin_asociacion']

const asText = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim())
const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** A missing or unknown estado is shown as "sin cuenta asociada": never invented as linked. */
export function toPredioEstado(value: unknown): PredioEstado {
  const match = PREDIO_ESTADOS.find((estado) => estado === value)
  return match ?? 'sin_asociacion'
}

export function mapPredioProperties(raw: RawPredioProperties): PredioLayerProperties {
  return {
    id: raw.id,
    idPredio: raw.idPredio,
    nroLote: asText(raw.nroLote),
    idManzana: asText(raw.idManzana),
    idUgestion: raw.idUgestion,
    idSucursal: raw.idSucursal,
    supTerreno: asNumber(raw.supTerreno),
    supConst: asNumber(raw.supConst),
    estado: toPredioEstado(raw.estado),
  }
}
