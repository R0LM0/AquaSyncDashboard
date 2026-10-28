import { describe, expect, it } from 'vitest'
import {
  bboxOfBounds,
  coordinatesText,
  googleMapsUrl,
  predioPopupLines,
  prediosHint,
  photoSrc,
  shouldLoadPredios,
  PREDIOS_MIN_ZOOM,
} from './mapView'
import type { PredioLayerProperties } from '@/domain/types'

const properties: PredioLayerProperties = {
  id: 1,
  idPredio: 2,
  nroLote: '12',
  idManzana: '7',
  idUgestion: 4,
  idSucursal: 17,
  supTerreno: 350.5,
  supConst: 120,
}

describe('map view helpers', () => {
  it('turns leaflet bounds into a bbox', () => {
    const bbox = bboxOfBounds({
      getWest: () => -86.3,
      getSouth: () => 12.1,
      getEast: () => -86.2,
      getNorth: () => 12.2,
    })

    expect(bbox).toEqual({ minLng: -86.3, minLat: 12.1, maxLng: -86.2, maxLat: 12.2 })
  })

  it('only asks for lots from zoom 15', () => {
    expect(shouldLoadPredios(PREDIOS_MIN_ZOOM - 1)).toBe(false)
    expect(shouldLoadPredios(PREDIOS_MIN_ZOOM)).toBe(true)
  })

  it('explains why the lots are missing or cut', () => {
    expect(prediosHint(12, false)).toBe('Acerque el mapa para ver predios')
    expect(prediosHint(12, false, 'Acerque el mapa para ver predios')).toBe(
      'Acerque el mapa para ver predios',
    )
    expect(prediosHint(16, true)).toBe('Mostrando 3000 predios: acerque más')
    expect(prediosHint(16, true, 'Mostrando 3000 predios: acerque más')).toBe(
      'Mostrando 3000 predios: acerque más',
    )
    expect(prediosHint(16, false)).toBeNull()
  })

  it('describes a lot for the popup', () => {
    expect(predioPopupLines(properties)).toEqual([
      ['Lote', '12'],
      ['Manzana', '7'],
      ['Superficie terreno', '350.5 m²'],
      ['Superficie construida', '120 m²'],
    ])
  })

  it('resolves photo URLs against the API base', () => {
    expect(photoSrc('api/FotosSigil/imagen/9001', 'http://host:8070/')).toBe(
      'http://host:8070/api/FotosSigil/imagen/9001',
    )
    expect(photoSrc('/api/FotosSigil/imagen/9001', 'http://host:8070/')).toBe(
      'http://host:8070/api/FotosSigil/imagen/9001',
    )
    expect(photoSrc('data:image/svg+xml;utf8,abc', 'http://host:8070/')).toBe(
      'data:image/svg+xml;utf8,abc',
    )
    expect(photoSrc('', 'http://host:8070/')).toBe('')
  })

  it('builds the coordinates text and the maps link', () => {
    expect(coordinatesText(12.1364, -86.2514)).toBe('12.136400, -86.251400')
    expect(googleMapsUrl(12.1364, -86.2514)).toBe('https://www.google.com/maps?q=12.1364,-86.2514')
  })
})
