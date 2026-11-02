import { describe, expect, it } from 'vitest'
import type { BarridoAsignacion } from '@/domain/types'
import {
  ALIAS_COLORS,
  activityFileName,
  aliasColor,
  assignmentLight,
  assignmentTotals,
  collectAliases,
  filterAssignments,
  filterRegistros,
  filterWorkedAccounts,
  hasLocation,
  limitRows,
  matchesQuery,
  sortWorkedAccounts,
  stackByDay,
} from './activity'

const row = (overrides: Partial<BarridoAsignacion> = {}): BarridoAsignacion => ({
  usrId: '1', usuario: 'jperez', cliBarridoId: '10', filial: '01', zona: '02', ruta: '03',
  periodoId: '202611', periodo: 'Noviembre 2026', asignadas: 100, encuestadas: 50, pendientes: 50, avance: 50, ...overrides,
})

describe('stackByDay', () => {
  it('builds one row per day with a zero for the aliases that did not work', () => {
    const { rows, aliases } = stackByDay([
      { fecha: '2026-11-02', dispositivo: 'Dispositivo B', cantidad: 3 },
      { fecha: '2026-11-01', dispositivo: 'Dispositivo A', cantidad: 2 },
      { fecha: '2026-11-02', dispositivo: 'Dispositivo A', cantidad: 4 },
    ])
    expect(aliases).toEqual(['Dispositivo A', 'Dispositivo B'])
    expect(rows).toEqual([
      { fecha: '2026-11-01', 'Dispositivo A': 2, 'Dispositivo B': 0 },
      { fecha: '2026-11-02', 'Dispositivo A': 4, 'Dispositivo B': 3 },
    ])
  })

  it('adds up repeated entries and is empty without data', () => {
    expect(stackByDay([]).rows).toEqual([])
    const { rows } = stackByDay([
      { fecha: '2026-11-01', dispositivo: 'A', cantidad: 1 },
      { fecha: '2026-11-01', dispositivo: 'A', cantidad: 2 },
    ])
    expect(rows[0].A).toBe(3)
  })
})

describe('aliases and colors', () => {
  it('orders aliases naturally and merges sources', () => {
    expect(
      collectAliases([{ alias: 'Dispositivo B' }, { alias: '' }], [{ dispositivo: 'Dispositivo A' }, { dispositivo: 'Dispositivo B' }]),
    ).toEqual(['Dispositivo A', 'Dispositivo B'])
  })

  it('gives the same color to the same alias and wraps around the palette', () => {
    const order = ['A', 'B']
    expect(aliasColor('A', order)).toBe(ALIAS_COLORS[0])
    expect(aliasColor('B', order)).toBe(ALIAS_COLORS[1])
    expect(aliasColor('A', order)).toBe(aliasColor('A', order))
    const many = Array.from({ length: ALIAS_COLORS.length + 1 }, (_, index) => `D${index}`)
    expect(aliasColor(many[ALIAS_COLORS.length], many)).toBe(ALIAS_COLORS[0])
  })
})

describe('search', () => {
  it('matches any value, ignoring case, and everything when empty', () => {
    expect(matchesQuery('', 'x')).toBe(true)
    expect(matchesQuery('ana', 'Ana Pérez', null)).toBe(true)
    expect(matchesQuery('zzz', 'Ana', 5)).toBe(false)
    expect(matchesQuery('5', 'Ana', 5)).toBe(true)
  })

  it('filters assignments by user, route or period', () => {
    const rows = [row(), row({ usuario: 'mlopez', ruta: '09', cliBarridoId: '11' })]
    expect(filterAssignments(rows, 'mlopez')).toHaveLength(1)
    expect(filterAssignments(rows, '09')).toHaveLength(1)
    expect(filterAssignments(rows, 'noviembre')).toHaveLength(2)
  })
})

describe('filterRegistros', () => {
  const registro = { id: '7', fecha: '2026-11-01T10:00:00Z', usuario: 'u1', alias: 'Dispositivo A', modelo: 'Moto', estado: 'Aprobado', sucursal: 'Managua', cliente: 'Ana Pérez', lat: null, lng: null }

  it('searches by client, estado, sucursal, device or id', () => {
    const rows = [registro, { ...registro, id: '8', cliente: 'Luis', estado: 'Pendiente' }]
    expect(filterRegistros(rows, 'pérez')).toHaveLength(1)
    expect(filterRegistros(rows, 'pendiente')).toHaveLength(1)
    expect(filterRegistros(rows, 'managua')).toHaveLength(2)
    expect(filterRegistros(rows, '8')).toHaveLength(1)
    expect(filterRegistros(rows, 'nadie')).toHaveLength(0)
  })
})

describe('assignments', () => {
  it('uses the ranking traffic light', () => {
    expect(assignmentLight({ encuestadas: 0, avance: 0 })).toBe('gris')
    expect(assignmentLight({ encuestadas: 10, avance: 30 })).toBe('rojo')
    expect(assignmentLight({ encuestadas: 60, avance: 60 })).toBe('amarillo')
    expect(assignmentLight({ encuestadas: 95, avance: 95 })).toBe('verde')
  })

  it('totals the progress of the list', () => {
    expect(assignmentTotals([row(), row({ asignadas: 100, encuestadas: 100, pendientes: 0, avance: 100 })])).toEqual({
      asignadas: 200, encuestadas: 150, pendientes: 50, avance: 75,
    })
    expect(assignmentTotals([]).avance).toBe(0)
  })
})

describe('small helpers', () => {
  it('limits the rows and reports how many are hidden', () => {
    expect(limitRows([1, 2, 3], 2)).toEqual({ shown: [1, 2], hidden: 1 })
    expect(limitRows([1], 2)).toEqual({ shown: [1], hidden: 0 })
  })

  it('knows when a record has a location', () => {
    expect(hasLocation({ lat: 1, lng: 2 })).toBe(true)
    expect(hasLocation({ lat: null, lng: 2 })).toBe(false)
  })

  it('names the files by day', () => {
    expect(activityFileName('Barrido', 'xlsx', new Date(2026, 10, 1))).toBe('Barrido-2026-11-01.xlsx')
  })
})

describe('worked accounts', () => {
  const puntos = [
    { referenciaId: '9100', cuenta: '100', catastro: 'C-1', alias: 'Dispositivo A', fecha: '2026-11-01T10:00:00Z', lat: 1, lng: 2 },
    { referenciaId: '9200', cuenta: '200', catastro: 'Ñandú-9', alias: 'Dispositivo B', fecha: '2026-11-01T12:00:00Z', lat: null, lng: null },
    { referenciaId: '9300', cuenta: '300', catastro: '', alias: 'Dispositivo A', fecha: '2026-10-31T09:00:00Z', lat: 1, lng: 2 },
  ]

  it('sorts newest first and keeps the map point index', () => {
    expect(sortWorkedAccounts(puntos).map((p) => [p.cuenta, p.index])).toEqual([['200', 1], ['100', 0], ['300', 2]])
  })

  it('searches cuenta, catastro and device ignoring case and accents', () => {
    const rows = sortWorkedAccounts(puntos)
    expect(filterWorkedAccounts(rows, '')).toHaveLength(3)
    expect(filterWorkedAccounts(rows, '200').map((p) => p.cuenta)).toEqual(['200'])
    expect(filterWorkedAccounts(rows, 'NANDU').map((p) => p.cuenta)).toEqual(['200'])
    expect(filterWorkedAccounts(rows, 'dispositivo a')).toHaveLength(2)
    expect(filterWorkedAccounts(rows, 'zzz')).toHaveLength(0)
  })
})
