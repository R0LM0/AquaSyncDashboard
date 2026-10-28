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
  /** Cascade-only levels: they narrow the catalogs, never the report queries. */
  departamentoId?: string
  ciudadId?: string
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

/** Map centre and zoom the user starts from (Alcance.Mapa). */
export interface MapCenter {
  lat: number
  lng: number
  zoom: number
}

/**
 * What SIGIL assigns to the user. A country user (`pais`) sees everything; a
 * restricted one is fixed to its departamento and unidad de gestión, and to its
 * sucursales when the list is not empty.
 */
export interface Alcance {
  pais: boolean
  ugestionId?: string
  ugestionNombre?: string
  dptoId?: string
  sucursales: string[]
  mapa: MapCenter
}

export interface Session {
  token: string
  usuario: string
  nombre: string
  /** UTC instant when the token expires, when the API reports it. */
  expiraEn?: string
  alcance: Alcance
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

/* ---------------------------------------------------------------- map layers */

export interface BBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/** GeoJSON is standard: lowercase members, geometry 4326, camelCase properties. */
export interface MultiPolygonGeometry {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export interface LayerFeature<Properties> {
  type: 'Feature'
  geometry: MultiPolygonGeometry
  properties: Properties
}

export interface LayerCollection<Properties> {
  type: 'FeatureCollection'
  features: Array<LayerFeature<Properties>>
}

export interface MapLayer<Properties> {
  collection: LayerCollection<Properties>
  /** The server cut the list: the client must zoom in. */
  truncated: boolean
  /** Server hint, e.g. "Acerque el mapa para ver predios". */
  message?: string
}

export interface UgestionLayerProperties {
  id: number
  nombre: string
}

export interface SucursalLayerProperties {
  id: number
  nombre: string
  ugestionId: number
}

/** Account state of a predio, as the API reports it (`estado`). */
export type PredioEstado = 'trabajado' | 'vinculado' | 'sin_ubicacion' | 'sin_asociacion'

export interface PredioLayerProperties {
  id: number
  idPredio: number
  nroLote: string
  idManzana: string
  idUgestion: number
  idSucursal: number
  supTerreno: number | null
  supConst: number | null
  estado: PredioEstado
}

export interface PrediosQuery {
  bbox: BBox
  zoom: number
  ugestionId?: string
  sucursalId?: string
  /** Period the "trabajado" state is measured on; the API default is the last 30 days. */
  desde?: string
  hasta?: string
}

/* ------------------------------------------------------------ account detail */

export interface AccountPhoto {
  adjuntoId: string
  tipo: number
  tipoNombre: string
  fecha: string
  descripcion: string
  /** Relative to the API base; that endpoint is anonymous. */
  urlImagen: string
}

export interface AccountHistoryEntry {
  id: string
  fecha: string
  usuario: string
  tipoCambio: ChangeType
  origen: string
  adjuntoId?: string
}

export interface AccountDetail {
  cuenta: string
  cliente: string
  direccion: string
  tipoServicio: string
  estado: string
  estadoAdministrativo: string
  medidor: string
  filial: string
  zona: string
  ruta: string
  numeroCatastral: string
  ugestionId: string
  ugestionNombre: string
  sucursalId: string
  sucursalNombre: string
  lat?: number
  lng?: number
  fotos: AccountPhoto[]
  historial: AccountHistoryEntry[]
}
