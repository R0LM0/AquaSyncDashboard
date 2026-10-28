import { describe, expect, it } from 'vitest'
import { predioEstadoLabel, PREDIO_ESTADO_STYLES, predioPathStyle } from './predioStyle'
import { predioPopupLines } from './mapView'

describe('predio colours', () => {
  it('takes the mobile palette for the account states', () => {
    expect(PREDIO_ESTADO_STYLES.vinculado).toMatchObject({ fill: '#2EAD58', fillOpacity: 0.36, stroke: '#146B31' })
    expect(PREDIO_ESTADO_STYLES.sin_ubicacion).toMatchObject({ fill: '#EE8D23', fillOpacity: 0.36, stroke: '#995010' })
    expect(PREDIO_ESTADO_STYLES.sin_asociacion).toMatchObject({ fill: '#87909A', fillOpacity: 0.36, stroke: '#444C56' })
  })

  it('paints the trabajado predios with the dashboard aqua and a stronger stroke', () => {
    const trabajado = PREDIO_ESTADO_STYLES.trabajado

    expect(trabajado.fill).toBe('#2ED4EA')
    expect(trabajado.fillOpacity).toBe(0.45)
    expect(trabajado.stroke).not.toBe(trabajado.fill)
  })

  it('gives every state a path style built from the same single source', () => {
    expect(predioPathStyle('vinculado')).toEqual({
      color: '#146B31',
      weight: 1.2,
      fillColor: '#2EAD58',
      fillOpacity: 0.36,
    })
  })

  it('labels the states the way the popup shows them', () => {
    expect(predioEstadoLabel('trabajado')).toBe('Trabajado en el período')
    expect(predioEstadoLabel('vinculado')).toBe('Cuenta vinculada')
    expect(predioEstadoLabel('sin_ubicacion')).toBe('Cuenta sin ubicación')
    expect(predioEstadoLabel('sin_asociacion')).toBe('Sin cuenta asociada')
  })

  it('shows the state label first in the predio popup', () => {
    const lines = predioPopupLines({
      id: 1,
      idPredio: 2,
      nroLote: '12',
      idManzana: '7',
      idUgestion: 4,
      idSucursal: 17,
      supTerreno: 350.5,
      supConst: 120,
      estado: 'sin_ubicacion',
    })

    expect(lines[0]).toEqual(['Estado', 'Cuenta sin ubicación'])
  })
})
