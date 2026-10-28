import { afterEach, describe, expect, it, vi } from 'vitest'
import { dashboardHubUrl } from '../../app/apiUrl'
import { ApiError, SessionExpiredError } from '../../domain/errors'
import type { Filters } from '../../domain/types'
import { HttpDashboardApi } from './HttpDashboardApi'
import { mapLiveChange, type ChangeRowDto } from './dto'

const API = 'http://192.168.1.15:8070/'
const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-27', ruta: '03' }

/** Fetch double: the adapter only reads `ok`, `status` and `json()`. */
function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

function lastCall(mock: ReturnType<typeof stubFetch>) {
  const [url, init] = mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit]
  return { url, init, headers: new Headers(init.headers) }
}

/** JSON examples taken verbatim from Docuemntacion/api-dashboard.md. */
const loginDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    Token: 'eyJhbGciOiJIUzI1NiIs...',
    Usuario: 'jperez',
    Nombre: 'Juan Pérez',
    ExpiraEn: '2026-10-28T04:00:00Z',
    Alcance: {
      Pais: false,
      UgestionId: 7,
      UgestionNombre: 'UG MANAGUA',
      DptoId: 2,
      Sucursales: [12, 15],
      Mapa: { Lat: 12.1364, Lng: -86.2514, Zoom: 12 },
    },
  },
}

const catalogsDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    Ugestiones: [{ Id: 5, Nombre: 'UG MANAGUA' }],
    Sucursales: [{ Id: 7, Nombre: 'SUCURSAL MANAGUA SUR', UgestionId: 5 }],
    Filiales: [{ Nombre: '01', UgestionId: 5, SucursalId: 7 }],
    Zonas: [{ Nombre: '02', Filial: '01' }],
    Rutas: [{ Nombre: '03', Filial: '01', Zona: '02' }],
    Usuarios: ['jperez', 'mlopez'],
  },
}

const summaryDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    CuentasTrabajadas: 120,
    FotosNuevas: 80,
    FotosActualizadas: 30,
    Ubicaciones: 25,
    UsuariosActivos: 4,
    AvanceRutaPct: 37.5,
  },
}

const dailyDoc = {
  Status: 200,
  Title: 'Success',
  Data: [{ Fecha: '2026-10-27', Usuario: 'jperez', TipoCambio: 'FotoNueva', Cambios: 12 }],
}

const userRouteDoc = {
  Status: 200,
  Title: 'Success',
  Data: [
    {
      Usuario: 'jperez',
      Filial: '01',
      Zona: '02',
      Ruta: '03',
      CuentasRuta: 340,
      CuentasTrabajadas: 45,
      Fotos: 50,
      Ubicaciones: 6,
      UltimaActividad: '2026-10-27T19:42:10Z',
    },
    {
      Usuario: 'mlopez',
      Filial: null,
      Zona: null,
      Ruta: null,
      CuentasRuta: 0,
      CuentasTrabajadas: 1,
      Fotos: 1,
      Ubicaciones: 0,
      UltimaActividad: '2026-10-26T10:00:00Z',
    },
  ],
}

const mapDoc = {
  Status: 200,
  Title: 'Success',
  Data: [
    {
      Cuenta: 5012,
      Cliente: 'MARIA GONZALEZ',
      Lat: 12.1364,
      Lng: -86.2514,
      TipoCambio: 'UbicacionCorregida',
      Usuario: 'jperez',
      Fecha: '2026-10-27T19:42:10Z',
    },
    {
      Cuenta: 5013,
      Cliente: null,
      Lat: 12.2,
      Lng: -86.3,
      TipoCambio: 'fotonueva',
      Usuario: 'mlopez',
      Fecha: '2026-10-27T18:00:00Z',
    },
  ],
}

const changesDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    Filas: [
      {
        Id: 1234,
        Fecha: '2026-10-27T19:42:10Z',
        Usuario: 'jperez',
        Cuenta: 5012,
        Cliente: 'MARIA GONZALEZ',
        Filial: '01',
        Zona: '02',
        Ruta: '03',
        TipoCambio: 'FotoNueva',
        Origen: 'online',
      },
      {
        Id: 1233,
        Fecha: '2026-10-27T18:00:00Z',
        Usuario: 'mlopez',
        Cuenta: 5013,
        Cliente: null,
        Filial: null,
        Zona: null,
        Ruta: null,
        TipoCambio: 'FotoActualizada',
        Origen: null,
      },
    ],
    Total: 2,
  },
}

const liveDoc = {
  id: 1234,
  fecha: '2026-10-27T19:42:10Z',
  usuario: 'jperez',
  cuenta: 5012,
  tipoCambio: 'FotoNueva',
  filial: '01',
  zona: '02',
  ruta: '03',
  ugestionId: 5,
  sucursalId: 7,
  adjuntoId: 99,
  lat: 12.1364,
  lng: -86.2514,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpDashboardApi login', () => {
  it('posts PascalCase credentials and maps the response to a session', async () => {
    const fetchMock = stubFetch(loginDoc)
    const api = new HttpDashboardApi(API)

    const session = await api.login('jperez', 'secreta')

    expect(session).toEqual({
      token: 'eyJhbGciOiJIUzI1NiIs...',
      usuario: 'jperez',
      nombre: 'Juan Pérez',
      expiraEn: '2026-10-28T04:00:00Z',
      alcance: {
        pais: false,
        ugestionId: '7',
        ugestionNombre: 'UG MANAGUA',
        dptoId: '2',
        sucursales: ['12', '15'],
        mapa: { lat: 12.1364, lng: -86.2514, zoom: 12 },
      },
    })

    const { url, init } = lastCall(fetchMock)
    expect(url).toBe(`${API}api/Dashboard/login`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ Usuario: 'jperez', Password: 'secreta' })
  })

  it('sends the token on every other endpoint when the API is created with one', async () => {
    const fetchMock = stubFetch(catalogsDoc)
    const api = new HttpDashboardApi(API, 'token-restaurado')

    await api.catalogs()

    expect(lastCall(fetchMock).headers.get('Authorization')).toBe('Bearer token-restaurado')
  })
})

describe('HttpDashboardApi reports', () => {
  it('maps the catalogs, using the SIGIL code as id for filial, zona and ruta', async () => {
    stubFetch(catalogsDoc)
    const api = new HttpDashboardApi(API, 't')

    await expect(api.catalogs()).resolves.toEqual({
      ugestiones: [{ id: '5', nombre: 'UG MANAGUA' }],
      sucursales: [{ id: '7', nombre: 'SUCURSAL MANAGUA SUR', ugestionId: '5' }],
      filiales: [{ id: '01', nombre: '01' }],
      zonas: [{ id: '02', nombre: '02', filial: '01' }],
      rutas: [{ id: '03', nombre: '03', filial: '01', zona: '02' }],
      usuarios: [
        { id: 'jperez', nombre: 'jperez' },
        { id: 'mlopez', nombre: 'mlopez' },
      ],
    })
  })

  it('maps the summary and keeps a null route percentage', async () => {
    stubFetch(summaryDoc)
    const api = new HttpDashboardApi(API, 't')
    expect(await api.summary(filters)).toEqual({
      cuentasTrabajadas: 120,
      fotosNuevas: 80,
      fotosActualizadas: 30,
      ubicaciones: 25,
      usuariosActivos: 4,
      avanceRutaPct: 37.5,
    })

    stubFetch({ ...summaryDoc, Data: { ...summaryDoc.Data, AvanceRutaPct: null } })
    expect((await api.summary({ desde: '2026-10-01', hasta: '2026-10-02' })).avanceRutaPct).toBeNull()
  })

  it('maps the daily progress and the filters it sends', async () => {
    const fetchMock = stubFetch(dailyDoc)
    const api = new HttpDashboardApi(API, 't')

    await expect(api.dailyProgress(filters)).resolves.toEqual([
      { fecha: '2026-10-27', usuario: 'jperez', tipoCambio: 'FotoNueva', cambios: 12 },
    ])
    expect(lastCall(fetchMock).url).toBe(
      `${API}api/Dashboard/avance-diario?ruta=03&desde=2026-10-01&hasta=2026-10-27`,
    )
  })

  it('maps the per-user route progress and turns null geography into empty text', async () => {
    stubFetch(userRouteDoc)
    const api = new HttpDashboardApi(API, 't')
    const rows = await api.userRouteProgress(filters)

    expect(rows[0]).toEqual({
      usuario: 'jperez',
      filial: '01',
      zona: '02',
      ruta: '03',
      cuentasRuta: 340,
      cuentasTrabajadas: 45,
      fotos: 50,
      ubicaciones: 6,
      ultimaActividad: '2026-10-27T19:42:10Z',
    })
    expect(rows[1]).toMatchObject({ filial: '', zona: '', ruta: '' })
  })

  it('maps the map points: numeric account to text, null client to empty, case-insensitive type', async () => {
    stubFetch(mapDoc)
    const api = new HttpDashboardApi(API, 't')
    const points = await api.mapPoints(filters)

    expect(points).toEqual([
      {
        cuenta: '5012',
        cliente: 'MARIA GONZALEZ',
        lat: 12.1364,
        lng: -86.2514,
        tipoCambio: 'UbicacionCorregida',
        usuario: 'jperez',
        fecha: '2026-10-27T19:42:10Z',
      },
      {
        cuenta: '5013',
        cliente: '',
        lat: 12.2,
        lng: -86.3,
        tipoCambio: 'FotoNueva',
        usuario: 'mlopez',
        fecha: '2026-10-27T18:00:00Z',
      },
    ])
  })

  it('maps Filas/Total to rows/total and caps the page size at 200', async () => {
    const fetchMock = stubFetch(changesDoc)
    const api = new HttpDashboardApi(API, 't')

    const page = await api.changes(filters, 2, 5_000)

    expect(page.total).toBe(2)
    expect(page.rows[0]).toEqual({
      id: '1234',
      fecha: '2026-10-27T19:42:10Z',
      usuario: 'jperez',
      cuenta: '5012',
      cliente: 'MARIA GONZALEZ',
      filial: '01',
      zona: '02',
      ruta: '03',
      tipoCambio: 'FotoNueva',
      origen: 'online',
    })
    expect(page.rows[1]).toMatchObject({ cliente: '', filial: '', zona: '', ruta: '', origen: '' })
    expect(lastCall(fetchMock).url).toBe(
      `${API}api/Dashboard/cambios?ruta=03&desde=2026-10-01&hasta=2026-10-27&pagina=2&tamano=200`,
    )
  })

  it('walks every page when exporting all the changes', async () => {
    const firstPage: ChangeRowDto[] = Array.from({ length: 200 }, (_, index) => ({
      Id: index + 1,
      Fecha: '2026-10-27T19:42:10Z',
      Usuario: 'jperez',
      Cuenta: 5012 + index,
      Cliente: 'CLIENTE',
      Filial: '01',
      Zona: '02',
      Ruta: '03',
      TipoCambio: 'FotoNueva',
      Origen: 'online',
    }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ Status: 200, Title: 'Success', Data: { Filas: firstPage, Total: 250 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          Status: 200,
          Title: 'Success',
          Data: { Filas: firstPage.slice(0, 50), Total: 250 },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const rows = await new HttpDashboardApi(API, 't').allChanges(filters)

    expect(rows).toHaveLength(250)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain('pagina=1&tamano=200')
    expect(String(fetchMock.mock.calls[1][0])).toContain('pagina=2&tamano=200')
  })
})

describe('HttpDashboardApi errors', () => {
  it('shows the envelope Message for a 400 (the real API sends Title "Bad Request")', async () => {
    stubFetch({ Status: 400, Title: 'Bad Request', Message: 'El rango máximo es 366 días' }, 400)

    await expect(new HttpDashboardApi(API, 't').summary(filters)).rejects.toThrow(
      'El rango máximo es 366 días',
    )
  })

  it('falls back to the envelope Title for a 400 without Message', async () => {
    stubFetch({ Status: 400, Title: 'Rango inválido' }, 400)

    await expect(new HttpDashboardApi(API, 't').summary(filters)).rejects.toThrow('Rango inválido')
  })

  it('says the credentials are wrong on a 401 at login', async () => {
    stubFetch({ Status: 401, Title: 'Unauthorized', Message: 'Usuario o contraseña incorrectos' }, 401)

    const error = await new HttpDashboardApi(API).login('jperez', 'mala').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as Error).message).toBe('Usuario o contraseña incorrectos')
    expect(error).not.toBeInstanceOf(SessionExpiredError)
  })

  it('expires the session on a 401 outside login', async () => {
    const status = 401
    stubFetch({ Status: status, Title: 'Unauthorized' }, status)

    await expect(new HttpDashboardApi(API, 't').summary(filters)).rejects.toBeInstanceOf(
      SessionExpiredError,
    )
  })

  it('reports an unavailable service on a 503', async () => {
    stubFetch({ Status: 503, Title: 'Service Unavailable' }, 503)

    await expect(new HttpDashboardApi(API, 't').catalogs()).rejects.toThrow('Servicio no disponible')
  })
})

/** Cobertura de ruta, as the API documents it (S3): PascalCase in, camelCase out. */
const coberturaDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    Filial: '01',
    Zona: '02',
    Ruta: '03',
    CuentasRuta: 3,
    Trabajadas: 1,
    Pendientes: 1,
    FueraDeRuta: 1,
    AvancePct: 33.3,
    Cuentas: [
      {
        Cuenta: 1001,
        Cliente: 'Pulpería La Esquina',
        Direccion: 'Calle 1',
        NumeroCatastral: '2.03.15',
        Estado: 'trabajada',
        Usuario: 'jperez',
        PrimeraActividad: '2026-10-27T14:00:00Z',
        UltimaActividad: '2026-10-27T15:00:00Z',
        Fotos: 2,
        Ubicaciones: 1,
        Lat: 12.1364,
        Lng: -86.2514,
      },
      {
        Cuenta: 1002,
        Cliente: null,
        Direccion: null,
        Estado: 'pendiente',
        Usuario: null,
        PrimeraActividad: null,
        UltimaActividad: null,
        Fotos: 0,
        Ubicaciones: 0,
        Lat: null,
        Lng: null,
      },
      {
        Cuenta: 1003,
        Cliente: 'Taller Mecánica',
        Direccion: 'Km 3',
        Estado: 'fuera_de_ruta',
        Usuario: 'mlopez',
        PrimeraActividad: '2026-10-26T10:00:00Z',
        UltimaActividad: '2026-10-26T10:00:00Z',
        Fotos: 0,
        Ubicaciones: 1,
        Lat: null,
        Lng: null,
      },
    ],
  },
}

describe('HttpDashboardApi cobertura de ruta', () => {
  it('calls the cobertura endpoint with the route as query params', async () => {
    const mock = stubFetch(coberturaDoc)
    const api = new HttpDashboardApi(API, 'token-x')

    await api.routeCoverage({ desde: '2026-10-01', hasta: '2026-10-27', filial: '01', zona: '02', ruta: '03' })

    const { url, headers } = lastCall(mock)
    expect(url).toBe(
      `${API}api/dashboard/cobertura-ruta?filial=01&zona=02&ruta=03&desde=2026-10-01&hasta=2026-10-27`,
    )
    expect(headers.get('Authorization')).toBe('Bearer token-x')
  })

  it('maps the route totals and every account with its estado', async () => {
    stubFetch(coberturaDoc)
    const api = new HttpDashboardApi(API, 'token-x')

    const coverage = await api.routeCoverage({ desde: '2026-10-01', hasta: '2026-10-27', filial: '01', zona: '02', ruta: '03' })

    expect(coverage).toEqual({
      filial: '01',
      zona: '02',
      ruta: '03',
      cuentasRuta: 3,
      trabajadas: 1,
      pendientes: 1,
      fueraDeRuta: 1,
      avancePct: 33.3,
      cuentas: [
        {
          cuenta: '1001',
          cliente: 'Pulpería La Esquina',
          direccion: 'Calle 1',
          numeroCatastral: '2.03.15',
          estado: 'trabajada',
          usuario: 'jperez',
          primeraActividad: '2026-10-27T14:00:00Z',
          ultimaActividad: '2026-10-27T15:00:00Z',
          fotos: 2,
          ubicaciones: 1,
          lat: 12.1364,
          lng: -86.2514,
        },
        {
          cuenta: '1002',
          cliente: '',
          direccion: '',
          numeroCatastral: '',
          estado: 'pendiente',
          usuario: null,
          primeraActividad: null,
          ultimaActividad: null,
          fotos: 0,
          ubicaciones: 0,
          lat: null,
          lng: null,
        },
        {
          cuenta: '1003',
          cliente: 'Taller Mecánica',
          direccion: 'Km 3',
          numeroCatastral: '',
          estado: 'fuera_de_ruta',
          usuario: 'mlopez',
          primeraActividad: '2026-10-26T10:00:00Z',
          ultimaActividad: '2026-10-26T10:00:00Z',
          fotos: 0,
          ubicaciones: 1,
          lat: null,
          lng: null,
        },
      ],
    })
  })

  it('surfaces the 400 Message when filial, zona or ruta is missing', async () => {
    stubFetch(
      { Status: 400, Title: 'Bad Request', Message: 'Seleccioná filial, zona y ruta para ver la cobertura' },
      400,
    )
    const api = new HttpDashboardApi(API, 'token-x')

    const failure = api.routeCoverage({ desde: '2026-10-01', hasta: '2026-10-27' })

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toThrow('Seleccioná filial, zona y ruta para ver la cobertura')
  })
})

describe('CambioRegistrado mapping', () => {
  it('maps the camelCase hub payload to the domain change', () => {
    expect(mapLiveChange(liveDoc)).toEqual({
      id: '1234',
      fecha: '2026-10-27T19:42:10Z',
      usuario: 'jperez',
      cuenta: '5012',
      cliente: '',
      filial: '01',
      zona: '02',
      ruta: '03',
      tipoCambio: 'FotoNueva',
      origen: '',
      lat: 12.1364,
      lng: -86.2514,
      ugestionId: '5',
      sucursalId: '7',
      adjuntoId: '99',
    })
  })

  it('accepts a payload with null geography and no coordinates', () => {
    const change = mapLiveChange({
      ...liveDoc,
      filial: null,
      zona: null,
      ruta: null,
      lat: null,
      lng: null,
    })

    expect(change).toMatchObject({ filial: '', zona: '', ruta: '' })
    expect(change.lat).toBeUndefined()
    expect(change.lng).toBeUndefined()
    expect(change.ugestionId).toBe('5')
  })

  it('builds the hub URL from the same API base', () => {
    expect(dashboardHubUrl(API)).toBe(`${API}hubs/dashboard`)
  })
})

/** Ranking de rutas, as the API documents it (S8): PascalCase in, camelCase out. */
const rankingDoc = {
  Status: 200,
  Title: 'Success',
  Data: [
    { Filial: '01', Zona: '02', Ruta: '03', CuentasRuta: 10, Trabajadas: 0, Pendientes: 10, AvancePct: 0, Usuarios: 0, UltimaActividad: null },
    { Filial: '01', Zona: '02', Ruta: '04', CuentasRuta: 10, Trabajadas: 9, Pendientes: 1, AvancePct: 90, Usuarios: 2, UltimaActividad: '2026-10-27T15:00:00Z' },
  ],
}

describe('HttpDashboardApi ranking de rutas', () => {
  it('calls the cobertura-rutas endpoint with the unit as query param', async () => {
    const mock = stubFetch(rankingDoc)
    const api = new HttpDashboardApi(API, 'token-x')

    await api.routeRanking({ desde: '2026-10-01', hasta: '2026-10-27', ugestionId: '5' })

    expect(lastCall(mock).url).toBe(`${API}api/dashboard/cobertura-rutas?ugestionId=5&desde=2026-10-01&hasta=2026-10-27`)
  })

  it('maps every route row, keeping a null last activity', async () => {
    stubFetch(rankingDoc)
    const api = new HttpDashboardApi(API, 'token-x')

    const rows = await api.routeRanking({ desde: '2026-10-01', hasta: '2026-10-27', ugestionId: '5' })

    expect(rows).toEqual([
      { filial: '01', zona: '02', ruta: '03', cuentasRuta: 10, trabajadas: 0, pendientes: 10, avancePct: 0, usuarios: 0, ultimaActividad: null },
      { filial: '01', zona: '02', ruta: '04', cuentasRuta: 10, trabajadas: 9, pendientes: 1, avancePct: 90, usuarios: 2, ultimaActividad: '2026-10-27T15:00:00Z' },
    ])
  })

  it('surfaces the 400 Message when neither unidad nor sucursal is given', async () => {
    stubFetch(
      { Status: 400, Title: 'Bad Request', Message: 'Seleccioná una unidad de gestión o sucursal para ver el ranking de rutas' },
      400,
    )
    const api = new HttpDashboardApi(API, 'token-x')

    await expect(api.routeRanking({ desde: '2026-10-01', hasta: '2026-10-27' })).rejects.toThrow(
      'Seleccioná una unidad de gestión o sucursal para ver el ranking de rutas',
    )
  })
})
