import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForbiddenError, NotFoundError, SessionExpiredError } from '../../domain/errors'
import type { Filters } from '../../domain/types'
import { HttpDashboardApi } from './HttpDashboardApi'
import { mapBarridoActividad, mapBarridoEncuesta } from './dto'

const API = 'http://192.168.1.15:8070/'

afterEach(() => vi.unstubAllGlobals())

describe('survey detail mapping', () => {
  it('maps the detail with its catalog texts', () => {
    const detail = mapBarridoEncuesta({
      Id: 203405,
      Fecha: '2026-11-01T21:52:41',
      Cuenta: 199395,
      Catastro: '5.75.9',
      Cliente: 'ANA',
      Direccion: 'Barrio 5',
      EstadoAdm: 'Alta',
      Rubro: 'CASA DOMICILIAR',
      Tarifa: null,
      Jardin: true,
      Tanque: true,
      TanqueM: 2,
      Observacion: null,
      Lat: 12.1,
      Lng: -86.2,
      TieneFoto: true,
    })

    expect(detail).toMatchObject({
      id: '203405',
      cuenta: '199395',
      estadoAdm: 'Alta',
      rubro: 'CASA DOMICILIAR',
      tarifa: '',
      jardin: true,
      piscina: false,
      tanque: true,
      tanqueM: 2,
      observacion: '',
      tieneFoto: true,
    })
  })

  it('keeps the referenciaId of the activity points', () => {
    const actividad = mapBarridoActividad({
      Puntos: [{ ReferenciaId: 203405, Cuenta: 1, Fecha: '2026-11-01T10:00:00Z', Lat: 1, Lng: 2 }],
    })

    expect(actividad.puntos[0].referenciaId).toBe('203405')
  })
})

describe('HttpDashboardApi survey and filters', () => {
  it('sends the whole filter set to barrido/asignaciones', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ Status: 200, Title: 'Success', Data: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    const filters: Filters = {
      ugestionId: '10',
      sucursalId: '1',
      filial: '700',
      zona: '5',
      ruta: '75',
      usuario: 'ESOLANOG',
      desde: '2026-10-31',
      hasta: '2026-11-02',
    }

    await new HttpDashboardApi(API, 't').barridoAsignaciones(filters)

    const url = new URL((fetchMock.mock.calls[0] as [string])[0])
    expect(url.pathname).toBe('/api/dashboard/barrido/asignaciones')
    expect(Object.fromEntries(url.searchParams)).toEqual(filters)
  })

  it('reads the detail from barrido/encuesta/{id}', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Status: 200, Title: 'Success', Data: { Id: 7, Fecha: '2026-11-01T00:00:00', Cuenta: 5 } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const detail = await new HttpDashboardApi(API, 't').barridoEncuesta('7')

    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(`${API}api/dashboard/barrido/encuesta/7`)
    expect(detail.id).toBe('7')
  })

  it('fetches the photo with the bearer token as a blob', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob })
    vi.stubGlobal('fetch', fetchMock)

    const result = await new HttpDashboardApi(API, 'tok').barridoEncuestaFoto('7')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API}api/dashboard/barrido/encuesta/7/foto`)
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok')
    expect(result).toBe(blob)
  })

  it.each([
    [404, NotFoundError],
    [403, ForbiddenError],
    [401, SessionExpiredError],
  ])('maps a %i on the photo to its error', async (status, error) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ Status: status, Title: 'x', Message: 'm' }) }))

    await expect(new HttpDashboardApi(API, 't').barridoEncuestaFoto('7')).rejects.toBeInstanceOf(error)
  })
})
