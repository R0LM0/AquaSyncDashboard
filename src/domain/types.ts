export type ChangeType =
  | 'FotoNueva'
  | 'FotoActualizada'
  | 'UbicacionNueva'
  | 'UbicacionCorregida'

/**
 * Dashboard filters. Dates are local calendar days in `YYYY-MM-DD` form.
 * Every field is optional except the date range, which always has a value.
 */
export interface Filters {
  ugestionId?: string
  sucursalId?: string
  filial?: string
  zona?: string
  ruta?: string
  usuario?: string
  desde: string
  hasta: string
  tipoCambio?: ChangeType
}

export interface CatalogOption {
  id: string
  nombre: string
}

export interface SucursalOption extends CatalogOption {
  ugestionId: string
}

export interface ZonaOption extends CatalogOption {
  filial: string
}

export interface RutaOption extends CatalogOption {
  filial: string
  zona: string
}

export interface Catalogs {
  ugestiones: CatalogOption[]
  sucursales: SucursalOption[]
  filiales: CatalogOption[]
  zonas: ZonaOption[]
  rutas: RutaOption[]
  usuarios: CatalogOption[]
}

export interface Session {
  token: string
  usuario: string
  nombre: string
  /** UTC instant when the token expires, when the API reports it. */
  expiraEn?: string
}

export interface Summary {
  cuentasTrabajadas: number
  fotosNuevas: number
  fotosActualizadas: number
  ubicaciones: number
  usuariosActivos: number
  /** `null` when the API cannot compute it (no filial/zona/ruta in the filters). */
  avanceRutaPct: number | null
}

export interface DailyProgress {
  fecha: string
  usuario: string
  tipoCambio: ChangeType
  cambios: number
}

export interface UserRouteProgress {
  usuario: string
  filial: string
  zona: string
  ruta: string
  cuentasRuta: number
  cuentasTrabajadas: number
  fotos: number
  ubicaciones: number
  ultimaActividad: string
}

export interface MapPoint {
  cuenta: string
  cliente: string
  lat: number
  lng: number
  tipoCambio: ChangeType
  usuario: string
  fecha: string
}

export interface ChangeRow {
  id: string
  fecha: string
  usuario: string
  cuenta: string
  cliente: string
  filial: string
  zona: string
  ruta: string
  tipoCambio: ChangeType
  origen: string
}

/**
 * A change pushed by the live channel. Coordinates and the organizational ids are
 * optional: the real SignalR payload carries them, a simpler transport may not.
 */
export type LiveChange = ChangeRow & {
  lat?: number
  lng?: number
  ugestionId?: string
  sucursalId?: string
  adjuntoId?: string
}

/** Geographic and organizational location of an account. */
export interface AccountMeta {
  cuenta: string
  cliente: string
  lat: number
  lng: number
  ruta: string
  filial: string
  zona: string
  sucursalId?: string
  ugestionId?: string
}

export interface Page<T> {
  rows: T[]
  total: number
}
