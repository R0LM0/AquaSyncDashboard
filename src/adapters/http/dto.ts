import type {
  AccountDetail,
  Catalogs,
  ChangeRow,
  ChangeType,
  DailyProgress,
  LiveChange,
  MapLayer,
  MapPoint,
  Page,
  Session,
  Summary,
  UserRouteProgress,
} from '../../domain/types'

/* The API answers in PascalCase; these DTOs mirror Docuemntacion/api-dashboard.md. */

export interface LoginDto {
  Token: string
  Usuario: string
  Nombre: string
  ExpiraEn: string
}

export interface CatalogsDto {
  Ugestiones: Array<{ Id: number; Nombre: string }>
  Sucursales: Array<{ Id: number; Nombre: string; UgestionId: number }>
  Filiales: Array<{ Nombre: string; UgestionId?: number | null; SucursalId?: number | null }>
  Zonas: Array<{ Nombre: string; Filial?: string | null }>
  Rutas: Array<{ Nombre: string; Filial?: string | null; Zona?: string | null }>
  Usuarios: string[]
}

export interface SummaryDto {
  CuentasTrabajadas: number
  FotosNuevas: number
  FotosActualizadas: number
  Ubicaciones: number
  UsuariosActivos: number
  AvanceRutaPct: number | null
}

export interface DailyProgressDto {
  Fecha: string
  Usuario: string
  TipoCambio: string
  Cambios: number
}

export interface UserRouteProgressDto {
  Usuario: string
  Filial?: string | null
  Zona?: string | null
  Ruta?: string | null
  CuentasRuta: number
  CuentasTrabajadas: number
  Fotos: number
  Ubicaciones: number
  UltimaActividad: string
}

export interface MapPointDto {
  Cuenta: number
  Cliente?: string | null
  Lat: number
  Lng: number
  TipoCambio: string
  Usuario: string
  Fecha: string
}

export interface ChangeRowDto {
  Id: number
  Fecha: string
  Usuario: string
  Cuenta: number
  Cliente?: string | null
  Filial?: string | null
  Zona?: string | null
  Ruta?: string | null
  TipoCambio: string
  Origen?: string | null
}

export interface ChangesPageDto {
  Filas: ChangeRowDto[]
  Total: number
}

/** SignalR sends the live payload in camelCase, with nullable geography. */
export interface LiveChangeDto {
  id: number
  fecha: string
  usuario: string
  cuenta: number
  tipoCambio: string
  filial?: string | null
  zona?: string | null
  ruta?: string | null
  ugestionId?: number | null
  sucursalId?: number | null
  adjuntoId?: number | null
  lat?: number | null
  lng?: number | null
}

const CHANGE_TYPES: readonly ChangeType[] = [
  'FotoNueva',
  'FotoActualizada',
  'UbicacionNueva',
  'UbicacionCorregida',
]

/** `tipoCambio` is case-insensitive on the wire; anything else is contract drift. */
export function toChangeType(value: string): ChangeType {
  const match = CHANGE_TYPES.find((tipo) => tipo.toLowerCase() === value?.toLowerCase())
  if (!match) throw new Error(`Tipo de cambio desconocido: ${value}`)
  return match
}

export function mapSession(dto: LoginDto): Session {
  return {
    token: dto.Token,
    usuario: dto.Usuario,
    nombre: dto.Nombre,
    expiraEn: dto.ExpiraEn,
  }
}

export function mapCatalogs(dto: CatalogsDto): Catalogs {
  return {
    ugestiones: dto.Ugestiones.map((option) => ({
      id: String(option.Id),
      nombre: option.Nombre,
    })),
    sucursales: dto.Sucursales.map((option) => ({
      id: String(option.Id),
      nombre: option.Nombre,
      ugestionId: String(option.UgestionId),
    })),
    // Filiales, zonas and rutas are identified by their SIGIL code (no numeric id).
    filiales: dto.Filiales.map((option) => ({ id: option.Nombre, nombre: option.Nombre })),
    zonas: dto.Zonas.map((option) => ({
      id: option.Nombre,
      nombre: option.Nombre,
      filial: option.Filial ?? '',
    })),
    rutas: dto.Rutas.map((option) => ({
      id: option.Nombre,
      nombre: option.Nombre,
      filial: option.Filial ?? '',
      zona: option.Zona ?? '',
    })),
    usuarios: dto.Usuarios.map((usuario) => ({ id: usuario, nombre: usuario })),
  }
}

export function mapSummary(dto: SummaryDto): Summary {
  return {
    cuentasTrabajadas: dto.CuentasTrabajadas,
    fotosNuevas: dto.FotosNuevas,
    fotosActualizadas: dto.FotosActualizadas,
    ubicaciones: dto.Ubicaciones,
    usuariosActivos: dto.UsuariosActivos,
    avanceRutaPct: dto.AvanceRutaPct,
  }
}

export function mapDailyProgress(dto: DailyProgressDto[]): DailyProgress[] {
  return dto.map((row) => ({
    fecha: row.Fecha,
    usuario: row.Usuario,
    tipoCambio: toChangeType(row.TipoCambio),
    cambios: row.Cambios,
  }))
}

export function mapUserRouteProgress(dto: UserRouteProgressDto[]): UserRouteProgress[] {
  return dto.map((row) => ({
    usuario: row.Usuario,
    filial: row.Filial ?? '',
    zona: row.Zona ?? '',
    ruta: row.Ruta ?? '',
    cuentasRuta: row.CuentasRuta,
    cuentasTrabajadas: row.CuentasTrabajadas,
    fotos: row.Fotos,
    ubicaciones: row.Ubicaciones,
    ultimaActividad: row.UltimaActividad,
  }))
}

export function mapMapPoint(dto: MapPointDto): MapPoint {
  return {
    cuenta: String(dto.Cuenta),
    cliente: dto.Cliente ?? '',
    lat: dto.Lat,
    lng: dto.Lng,
    tipoCambio: toChangeType(dto.TipoCambio),
    usuario: dto.Usuario,
    fecha: dto.Fecha,
  }
}

export function mapChangeRow(dto: ChangeRowDto): ChangeRow {
  return {
    id: String(dto.Id),
    fecha: dto.Fecha,
    usuario: dto.Usuario,
    cuenta: String(dto.Cuenta),
    cliente: dto.Cliente ?? '',
    filial: dto.Filial ?? '',
    zona: dto.Zona ?? '',
    ruta: dto.Ruta ?? '',
    tipoCambio: toChangeType(dto.TipoCambio),
    origen: dto.Origen ?? '',
  }
}

export function mapChangesPage(dto: ChangesPageDto): Page<ChangeRow> {
  return {
    rows: dto.Filas.map(mapChangeRow),
    total: dto.Total,
  }
}

export function mapLiveChange(dto: LiveChangeDto): LiveChange {
  return {
    id: String(dto.id),
    fecha: dto.fecha,
    usuario: dto.usuario,
    cuenta: String(dto.cuenta),
    cliente: '',
    filial: dto.filial ?? '',
    zona: dto.zona ?? '',
    ruta: dto.ruta ?? '',
    tipoCambio: toChangeType(dto.tipoCambio),
    origen: '',
    lat: dto.lat ?? undefined,
    lng: dto.lng ?? undefined,
    ugestionId: dto.ugestionId == null ? undefined : String(dto.ugestionId),
    sucursalId: dto.sucursalId == null ? undefined : String(dto.sucursalId),
    adjuntoId: dto.adjuntoId == null ? undefined : String(dto.adjuntoId),
  }
}

/* --------------------------------------------------------------- map layers */

export interface LayerFeatureDto<Properties> {
  type: string
  geometry: { type: string; coordinates: number[][][][] | number[][][] }
  properties: Properties
}

export interface LayerDto<Properties> {
  type: string
  features: Array<LayerFeatureDto<Properties>>
  /** PascalCase even inside the GeoJSON Data (see the API doc). */
  Truncated?: boolean
}

export interface UgestionLayerPropertiesDto {
  id: number
  nombre: string
}

export interface SucursalLayerPropertiesDto {
  id: number
  nombre: string
  ugestionId: number
}

export interface PredioLayerPropertiesDto {
  id: number
  idPredio: number
  nroLote: string
  idManzana: string
  idUgestion: number
  idSucursal: number
  supTerreno: number
  supConst: number
}

/**
 * `Truncated` sits inside `Data`; `Message` stays on the envelope. Geometry is
 * kept as is: leaflet consumes standard GeoJSON.
 */
export function mapLayer<PropertiesDto, Properties>(
  dto: LayerDto<PropertiesDto> | undefined | null,
  mapProperties: (raw: PropertiesDto) => Properties,
): MapLayer<Properties> {
  const features = (dto?.features ?? []).flatMap((feature) => {
    const geometry = feature.geometry
    if (!geometry) return []

    const coordinates =
      geometry.type === 'Polygon'
        ? [geometry.coordinates as number[][][]]
        : (geometry.coordinates as number[][][][])

    return [
      {
        type: 'Feature' as const,
        geometry: { type: 'MultiPolygon' as const, coordinates },
        properties: mapProperties(feature.properties),
      },
    ]
  })

  return {
    collection: { type: 'FeatureCollection', features },
    truncated: Boolean(dto?.Truncated),
  }
}

/* ----------------------------------------------------------- account detail */

export interface AccountPhotoDto {
  AdjuntoId: number
  Tipo: number
  TipoNombre?: string | null
  Fecha: string
  Descripcion?: string | null
  UrlImagen: string
}

export interface AccountHistoryDto {
  Id: number
  Fecha: string
  Usuario: string
  TipoCambio: string
  Origen?: string | null
  AdjuntoId?: number | null
}

export interface AccountDetailDto {
  Cuenta: number
  Cliente?: string | null
  Direccion?: string | null
  TipoServicio?: string | null
  Estado?: string | null
  EstadoAdministrativo?: string | null
  Medidor?: string | null
  Filial?: string | null
  Zona?: string | null
  Ruta?: string | null
  NumeroCatastral?: string | null
  UgestionId?: number | null
  UgestionNombre?: string | null
  SucursalId?: number | null
  SucursalNombre?: string | null
  Lat?: number | null
  Lng?: number | null
  Fotos?: AccountPhotoDto[]
  Historial?: AccountHistoryDto[]
}

export function mapAccountDetail(dto: AccountDetailDto): AccountDetail {
  return {
    cuenta: String(dto.Cuenta),
    cliente: dto.Cliente ?? '',
    direccion: dto.Direccion ?? '',
    tipoServicio: dto.TipoServicio ?? '',
    estado: dto.Estado ?? '',
    estadoAdministrativo: dto.EstadoAdministrativo ?? '',
    medidor: dto.Medidor ?? '',
    filial: dto.Filial ?? '',
    zona: dto.Zona ?? '',
    ruta: dto.Ruta ?? '',
    numeroCatastral: dto.NumeroCatastral ?? '',
    ugestionId: dto.UgestionId == null ? '' : String(dto.UgestionId),
    ugestionNombre: dto.UgestionNombre ?? '',
    sucursalId: dto.SucursalId == null ? '' : String(dto.SucursalId),
    sucursalNombre: dto.SucursalNombre ?? '',
    lat: dto.Lat ?? undefined,
    lng: dto.Lng ?? undefined,
    fotos: (dto.Fotos ?? []).map((photo) => ({
      adjuntoId: String(photo.AdjuntoId),
      tipo: photo.Tipo,
      tipoNombre: photo.TipoNombre ?? '',
      fecha: photo.Fecha,
      descripcion: photo.Descripcion ?? '',
      urlImagen: photo.UrlImagen,
    })),
    historial: (dto.Historial ?? []).map((entry) => ({
      id: String(entry.Id),
      fecha: entry.Fecha,
      usuario: entry.Usuario,
      tipoCambio: toChangeType(entry.TipoCambio),
      origen: entry.Origen ?? '',
      adjuntoId: entry.AdjuntoId == null ? undefined : String(entry.AdjuntoId),
    })),
  }
}
