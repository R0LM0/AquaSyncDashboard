import { describe, expect, it } from 'vitest'
import { predioPopupLines } from '@/features/dashboard/map/mapView'
import { mapPredioProperties } from './predioProperties'

describe('predio properties from the API', () => {
  it('turns numeric lot and block codes into text (SIGIL sends them as numbers)', () => {
    const props = mapPredioProperties({
      id: 1,
      idPredio: 77,
      nroLote: 12,
      idManzana: 340,
      idUgestion: 9,
      idSucursal: 33,
      supTerreno: 250.5,
      supConst: 80,
    })

    expect(props.nroLote).toBe('12')
    expect(props.idManzana).toBe('340')
  })

  it('keeps missing values as empty text and null surfaces, and the popup shows a dash', () => {
    const props = mapPredioProperties({
      id: 2,
      idPredio: 78,
      nroLote: null,
      idManzana: undefined,
      idUgestion: 9,
      idSucursal: 33,
      supTerreno: null,
      supConst: undefined,
    })

    expect(props.nroLote).toBe('')
    expect(props.supTerreno).toBeNull()
    expect(predioPopupLines(props)).toEqual([
      ['Lote', '—'],
      ['Manzana', '—'],
      ['Superficie terreno', '—'],
      ['Superficie construida', '—'],
    ])
  })
})
