import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '@/domain/errors'
import type { MapLayer, UgestionLayerProperties } from '@/domain/types'
import { HttpDashboardApi } from './HttpDashboardApi'

const API = 'http://192.168.1.15:8070/'

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
  return String(mock.mock.calls[mock.mock.calls.length - 1][0])
}

const ugestionesDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[-86.25, 12.13], [-86.24, 12.13], [-86.24, 12.14], [-86.25, 12.13]]]],
        },
        properties: { id: 4, nombre: 'UG ejemplo' },
      },
    ],
  },
}

const sucursalesDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[-86.25, 12.13], [-86.24, 12.13], [-86.24, 12.14], [-86.25, 12.13]]]],
        },
        properties: { id: 17, nombre: 'Sucursal ejemplo', ugestionId: 4 },
      },
    ],
  },
}

const prediosLowZoomDoc = {
  Status: 200,
  Title: 'Success',
  Message: 'Acerque el mapa para ver predios',
  Data: { type: 'FeatureCollection', features: [], Truncated: false },
}

const prediosDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[-86.25, 12.13], [-86.24, 12.13], [-86.24, 12.14], [-86.25, 12.13]]]],
        },
        properties: {
          id: 90123,
          idPredio: 555001,
          nroLote: '12',
          idManzana: '7',
          idUgestion: 4,
          idSucursal: 17,
          supTerreno: 350.5,
          supConst: 120,
        },
      },
    ],
    Truncated: true,
  },
}

const accountDoc = {
  Status: 200,
  Title: 'Success',
  Data: {
    Cuenta: 5012,
    Cliente: 'CLIENTE EJEMPLO',
    Direccion: 'DIRECCION EJEMPLO',
    TipoServicio: '1',
    Estado: 'A',
    EstadoAdministrativo: 'A',
    Medidor: 'M-0001',
    Filial: '01',
    Zona: '02',
    Ruta: '003',
    NumeroCatastral: '02.003.5012',
    UgestionId: 4,
    UgestionNombre: 'UG ejemplo',
    SucursalId: 17,
    SucursalNombre: 'Sucursal ejemplo',
    Lat: 12.1364,
    Lng: -86.2514,
    Fotos: [
      {
        AdjuntoId: 9001,
        Tipo: 2,
        TipoNombre: 'Fachada',
        Fecha: '2026-10-20T10:15:00',
        Descripcion: 'Fachada del predio',
        UrlImagen: 'api/FotosSigil/imagen/9001',
      },
    ],
    Historial: [
      {
        Id: 88123,
        Fecha: '2026-10-27T19:42:10',
        Usuario: 'jperez',
        TipoCambio: 'UbicacionCorregida',
        Origen: 'app',
        AdjuntoId: null,
      },
    ],
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpDashboardApi map layers', () => {
  it('maps the gestión polygons out of a GeoJSON Data', async () => {
    const fetchMock = stubFetch(ugestionesDoc)
    const api = new HttpDashboardApi(API, 't')

    const layer = await api.layerUgestiones()

    expect(layer.truncated).toBe(false)
    expect(layer.collection.type).toBe('FeatureCollection')
    expect(layer.collection.features[0]).toEqual({
      type: 'Feature',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[-86.25, 12.13], [-86.24, 12.13], [-86.24, 12.14], [-86.25, 12.13]]]],
      },
      properties: { id: 4, nombre: 'UG ejemplo' },
    })
    expect(lastUrl(fetchMock)).toBe(`${API}api/Dashboard/capas/ugestiones`)
  })

  it('sends the gestión filter for sucursales', async () => {
    const fetchMock = stubFetch(sucursalesDoc)
    const api = new HttpDashboardApi(API, 't')

    const layer = await api.layerSucursales('4')

    expect(layer.collection.features[0].properties).toEqual({
      id: 17,
      nombre: 'Sucursal ejemplo',
      ugestionId: 4,
    })
    expect(lastUrl(fetchMock)).toBe(`${API}api/Dashboard/capas/sucursales?ugestionId=4`)
  })

  it('sends bbox and zoom for the lots and keeps Truncated and Message', async () => {
    const fetchMock = stubFetch(prediosDoc)
    const api = new HttpDashboardApi(API, 't')

    const layer = await api.layerPredios({
      bbox: { minLng: -86.3, minLat: 12.1, maxLng: -86.2, maxLat: 12.2 },
      zoom: 16,
      ugestionId: '4',
      sucursalId: '17',
    })

    expect(layer.truncated).toBe(true)
    expect(layer.collection.features[0].properties).toMatchObject({
      nroLote: '12',
      idManzana: '7',
      supTerreno: 350.5,
      supConst: 120,
    })
    expect(lastUrl(fetchMock)).toContain('api/Dashboard/capas/predios?')
    expect(lastUrl(fetchMock)).toContain('bbox=-86.300000%2C12.100000%2C-86.200000%2C12.200000')
    expect(lastUrl(fetchMock)).toContain('zoom=16')
    expect(lastUrl(fetchMock)).toContain('ugestionId=4')
    expect(lastUrl(fetchMock)).toContain('sucursalId=17')
  })

  it('reads the low zoom hint from the envelope Message', async () => {
    stubFetch(prediosLowZoomDoc)
    const api = new HttpDashboardApi(API, 't')

    const layer = await api.layerPredios({
      bbox: { minLng: -86.3, minLat: 12.1, maxLng: -86.2, maxLat: 12.2 },
      zoom: 10,
    })

    expect(layer.collection.features).toEqual([])
    expect(layer.message).toBe('Acerque el mapa para ver predios')
  })

  it('caches an administrative layer for the session', async () => {
    const fetchMock = stubFetch(ugestionesDoc)
    const api = new HttpDashboardApi(API, 't')

    const first = await api.layerUgestiones()
    const second = await api.layerUgestiones()

    expect(first).toBe(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('HttpDashboardApi account detail', () => {
  it('maps the account, its photos and its history', async () => {
    const fetchMock = stubFetch(accountDoc)
    const api = new HttpDashboardApi(API, 't')

    const detail = await api.accountDetail('5012')

    expect(detail).toMatchObject({
      cuenta: '5012',
      cliente: 'CLIENTE EJEMPLO',
      numeroCatastral: '02.003.5012',
      ugestionId: '4',
      sucursalNombre: 'Sucursal ejemplo',
      lat: 12.1364,
      lng: -86.2514,
    })
    expect(detail.fotos[0]).toEqual({
      adjuntoId: '9001',
      tipo: 2,
      tipoNombre: 'Fachada',
      fecha: '2026-10-20T10:15:00',
      descripcion: 'Fachada del predio',
      urlImagen: 'api/FotosSigil/imagen/9001',
    })
    expect(detail.historial[0]).toEqual({
      id: '88123',
      fecha: '2026-10-27T19:42:10',
      usuario: 'jperez',
      tipoCambio: 'UbicacionCorregida',
      origen: 'app',
      adjuntoId: undefined,
    })
    expect(lastUrl(fetchMock)).toBe(`${API}api/Dashboard/cuenta/5012`)
  })

  it('turns a 404 into a typed error', async () => {
    stubFetch({ Status: 404, Title: 'Not Found', Message: 'La cuenta no existe en SIGIL' }, 404)

    const error = await new HttpDashboardApi(API, 't')
      .accountDetail('9999')
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(NotFoundError)
    expect((error as Error).message).toBe('La cuenta no existe en SIGIL')
  })
})

describe('layer typing', () => {
  it('keeps the layer shape usable by leaflet', () => {
    const layer: MapLayer<UgestionLayerProperties> = {
      collection: { type: 'FeatureCollection', features: [] },
      truncated: false,
    }

    expect(layer.collection.type).toBe('FeatureCollection')
  })
})
