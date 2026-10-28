import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, SessionExpiredError } from '../../domain/errors'
import type { Filters } from '../../domain/types'
import { HttpDashboardApi } from './HttpDashboardApi'

const API = 'http://192.168.1.15:8070/'
const filters: Filters = { desde: '2026-10-01', hasta: '2026-10-27' }

function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

function lastUrl(mock: ReturnType<typeof stubFetch>): string {
  return (mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit])[0]
}

const restrictedLogin = {
  Status: 200,
  Title: 'Success',
  Data: {
    Token: 'eyJhbGciOiJIUzI1NiIs...',
    Usuario: 'dsoriano',
    Nombre: 'D. Soriano',
    ExpiraEn: '2026-10-28T04:00:00Z',
    Alcance: {
      Pais: false,
      UgestionId: 4,
      UgestionNombre: 'UG MADRIZ',
      DptoId: 4,
      Sucursales: [],
      Mapa: { Lat: 13.48, Lng: -86.47, Zoom: 11 },
    },
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login Alcance', () => {
  it('maps the scope of a restricted user', async () => {
    stubFetch(restrictedLogin)

    const session = await new HttpDashboardApi(API).login('dsoriano', 'clave')

    expect(session.alcance).toEqual({
      pais: false,
      ugestionId: '4',
      ugestionNombre: 'UG MADRIZ',
      dptoId: '4',
      sucursales: [],
      mapa: { lat: 13.48, lng: -86.47, zoom: 11 },
    })
  })

  it('maps a country user without unidad or departamento', async () => {
    stubFetch({
      Status: 200,
      Title: 'Success',
      Data: {
        ...restrictedLogin.Data,
        Usuario: 'admin',
        Alcance: {
          Pais: true,
          UgestionId: null,
          UgestionNombre: null,
          DptoId: null,
          Sucursales: [],
          Mapa: { Lat: 12.8654, Lng: -85.2072, Zoom: 7 },
        },
      },
    })

    const session = await new HttpDashboardApi(API).login('admin', 'clave')

    expect(session.alcance.pais).toBe(true)
    expect(session.alcance.ugestionId).toBeUndefined()
    expect(session.alcance.dptoId).toBeUndefined()
    expect(session.alcance.mapa).toEqual({ lat: 12.8654, lng: -85.2072, zoom: 7 })
  })
})

describe('403 outside login', () => {
  it('is a no-access error that keeps the session', async () => {
    stubFetch({ Status: 403, Title: 'Forbidden', Message: 'No tiene acceso a esa unidad de gestión' }, 403)

    const error = await new HttpDashboardApi(API, 't').summary(filters).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ForbiddenError)
    expect(error).not.toBeInstanceOf(SessionExpiredError)
    expect((error as Error).message).toBe('No tiene acceso a esos datos')
  })

  it('still expires the session on a 401', async () => {
    stubFetch({ Status: 401, Title: 'Unauthorized' }, 401)

    await expect(new HttpDashboardApi(API, 't').summary(filters)).rejects.toBeInstanceOf(SessionExpiredError)
  })
})

describe('cascade catalogs', () => {
  it('reads the departamentos without parents', async () => {
    const mock = stubFetch({ Status: 200, Title: 'Success', Data: [{ Id: 4, Nombre: 'MADRIZ' }] })

    const options = await new HttpDashboardApi(API, 't').cascade('departamento', {})

    expect(lastUrl(mock)).toBe(`${API}api/Dashboard/catalogos/departamentos`)
    expect(options).toEqual([{ id: '4', nombre: 'MADRIZ' }])
  })

  it('reads the unidades de gestión of a departamento', async () => {
    const mock = stubFetch({ Status: 200, Title: 'Success', Data: [{ Id: 4, Nombre: 'UG MADRIZ' }] })

    await new HttpDashboardApi(API, 't').cascade('ugestion', { dptoId: '4' })

    expect(lastUrl(mock)).toBe(`${API}api/Dashboard/catalogos/unidades-gestion?dptoId=4`)
  })

  it('reads the sucursales of a ciudad', async () => {
    const mock = stubFetch({ Status: 200, Title: 'Success', Data: [{ Id: 401, Nombre: 'SOMOTO' }] })

    const options = await new HttpDashboardApi(API, 't').cascade('sucursal', { ciudadId: '41' })

    expect(lastUrl(mock)).toBe(`${API}api/Dashboard/catalogos/sucursales?ciudadId=41`)
    expect(options).toEqual([{ id: '401', nombre: 'SOMOTO' }])
  })

  it('sends the whole parent chain to the filiales, zonas and rutas', async () => {
    const parents = { dptoId: '4', ugestionId: '4', ciudadId: '41', sucursalId: '401' }
    const mock = stubFetch({ Status: 200, Title: 'Success', Data: [{ Valor: '590' }] })
    const http = new HttpDashboardApi(API, 't')

    const filiales = await http.cascade('filial', parents)
    expect(lastUrl(mock)).toBe(
      `${API}api/Dashboard/catalogos/filiales?dptoId=4&ugestionId=4&ciudadId=41&sucursalId=401`,
    )
    expect(filiales).toEqual([{ id: '590', nombre: '590' }])

    await http.cascade('zona', { ...parents, filial: '590' })
    expect(lastUrl(mock)).toBe(
      `${API}api/Dashboard/catalogos/zonas?dptoId=4&ugestionId=4&ciudadId=41&sucursalId=401&filial=590`,
    )

    await http.cascade('ruta', { ...parents, filial: '590', zona: 'Zona Somoto Centro' })
    expect(lastUrl(mock)).toBe(
      `${API}api/Dashboard/catalogos/rutas?dptoId=4&ugestionId=4&ciudadId=41&sucursalId=401&filial=590&zona=Zona+Somoto+Centro`,
    )
  })
})

describe('predios period and estado', () => {
  it('sends the period filters with the predio query', async () => {
    const mock = stubFetch({ Status: 200, Title: 'Success', Data: { type: 'FeatureCollection', features: [] } })

    await new HttpDashboardApi(API, 't').layerPredios({
      bbox: { minLng: -86.5, minLat: 13.4, maxLng: -86.4, maxLat: 13.5 },
      zoom: 16,
      desde: '2026-10-01',
      hasta: '2026-10-27',
    })

    expect(lastUrl(mock)).toContain('desde=2026-10-01')
    expect(lastUrl(mock)).toContain('hasta=2026-10-27')
  })

  it('maps the estado of every predio', async () => {
    stubFetch({
      Status: 200,
      Title: 'Success',
      Data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [[[-86.5, 13.4], [-86.49, 13.4], [-86.49, 13.41], [-86.5, 13.4]]] },
            properties: {
              id: 1,
              idPredio: 2,
              nroLote: 12,
              idManzana: 7,
              idUgestion: 4,
              idSucursal: 401,
              supTerreno: 300,
              supConst: null,
              estado: 'trabajado',
            },
          },
        ],
        Truncated: false,
      },
    })

    const layer = await new HttpDashboardApi(API, 't').layerPredios({
      bbox: { minLng: -86.5, minLat: 13.4, maxLng: -86.4, maxLat: 13.5 },
      zoom: 16,
    })

    expect(layer.collection.features[0].properties.estado).toBe('trabajado')
  })
})
