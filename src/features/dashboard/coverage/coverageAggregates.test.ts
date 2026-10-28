import { describe, expect, it } from 'vitest'
import type { CoverageAccount } from '@/domain/types'
import { coverageSlices, workedPerDay, workedPerUser } from './coverageAggregates'

function account(overrides: Partial<CoverageAccount> & Pick<CoverageAccount, 'cuenta' | 'estado'>): CoverageAccount {
  return {
    cliente: '',
    direccion: '',
    usuario: null,
    primeraActividad: null,
    ultimaActividad: null,
    fotos: 0,
    ubicaciones: 0,
    lat: null,
    lng: null,
    ...overrides,
  }
}

/** Local-time instants, so the day key does not depend on the test machine's zone. */
const at = (day: number, hour = 10) => new Date(2026, 9, day, hour).toISOString()

const accounts: CoverageAccount[] = [
  account({ cuenta: '1', estado: 'trabajada', usuario: 'jperez', primeraActividad: at(27, 8) }),
  account({ cuenta: '2', estado: 'trabajada', usuario: 'mlopez', primeraActividad: at(27, 15) }),
  account({ cuenta: '3', estado: 'trabajada', usuario: 'jperez', primeraActividad: at(25, 9) }),
  account({ cuenta: '4', estado: 'pendiente' }),
  account({ cuenta: '5', estado: 'fuera_de_ruta', usuario: 'mlopez', primeraActividad: at(20, 9) }),
]

describe('workedPerDay', () => {
  it('counts the worked accounts by the day of their first activity, oldest day first', () => {
    expect(workedPerDay(accounts)).toEqual([
      { dia: '2026-10-25', trabajadas: 1 },
      { dia: '2026-10-27', trabajadas: 2 },
    ])
  })

  it('ignores pending and out-of-route accounts', () => {
    expect(workedPerDay([account({ cuenta: '9', estado: 'pendiente' })])).toEqual([])
  })
})

describe('workedPerUser', () => {
  it('counts the worked accounts per user, most worked first', () => {
    expect(workedPerUser(accounts)).toEqual([
      { usuario: 'jperez', trabajadas: 2 },
      { usuario: 'mlopez', trabajadas: 1 },
    ])
  })

  it('does not count the out-of-route accounts as worked', () => {
    const onlyOutOfRoute = [account({ cuenta: '5', estado: 'fuera_de_ruta', usuario: 'mlopez' })]

    expect(workedPerUser(onlyOutOfRoute)).toEqual([])
  })
})

describe('coverageSlices', () => {
  it('splits the accounts by estado and leaves out the empty slices', () => {
    const slices = coverageSlices(accounts)

    expect(slices.map((slice) => [slice.estado, slice.value])).toEqual([
      ['trabajada', 3],
      ['pendiente', 1],
      ['fuera_de_ruta', 1],
    ])
  })

  it('omits a slice with no accounts', () => {
    const slices = coverageSlices([account({ cuenta: '1', estado: 'pendiente' })])

    expect(slices.map((slice) => slice.estado)).toEqual(['pendiente'])
  })
})
