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

  it.each([401, 403])('expires the session on a %i outside login', async (status) => {
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
