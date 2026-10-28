import { describe, expect, it } from 'vitest'
import type { RouteRankingRow } from '@/domain/types'
import {
  filterRoutes,
  rankingKpis,
  rankingFileName,
  routeName,
  sortRoutes,
  trafficLight,
} from './routeRanking'

function row(overrides: Partial<RouteRankingRow> & Pick<RouteRankingRow, 'ruta' | 'cuentasRuta' | 'trabajadas'>): RouteRankingRow {
  const avancePct = overrides.cuentasRuta > 0 ? Math.round((overrides.trabajadas * 1000) / overrides.cuentasRuta) / 10 : 0
  return {
    filial: '01',
    zona: '02',
    pendientes: overrides.cuentasRuta - overrides.trabajadas,
    avancePct,
    usuarios: overrides.trabajadas > 0 ? 1 : 0,
    ultimaActividad: null,
    ...overrides,
  }
}

const rows: RouteRankingRow[] = [
  row({ ruta: '03', cuentasRuta: 10, trabajadas: 0 }),
  row({ ruta: '04', cuentasRuta: 10, trabajadas: 3 }),
  row({ ruta: '05', cuentasRuta: 10, trabajadas: 5 }),
  row({ ruta: '06', cuentasRuta: 10, trabajadas: 9 }),
]

describe('trafficLight', () => {
  it('is gray for a route with no worked account', () => {
    expect(trafficLight(row({ ruta: '1', cuentasRuta: 10, trabajadas: 0 }))).toBe('gris')
  })

  it('is green from 90 percent, yellow from 50 to 89.9, red below 50', () => {
    expect(trafficLight(row({ ruta: '1', cuentasRuta: 10, trabajadas: 9 }))).toBe('verde')
    expect(trafficLight(row({ ruta: '1', cuentasRuta: 10, trabajadas: 8 }))).toBe('amarillo')
    expect(trafficLight(row({ ruta: '1', cuentasRuta: 10, trabajadas: 5 }))).toBe('amarillo')
    expect(trafficLight(row({ ruta: '1', cuentasRuta: 10, trabajadas: 4 }))).toBe('rojo')
  })
})

describe('rankingKpis', () => {
  it('counts complete, in-progress and not started routes and the pending accounts', () => {
    expect(rankingKpis(rows)).toEqual({
      rutas: 4,
      completas: 1,
      enCurso: 2,
      sinIniciar: 1,
      pendientes: 10 + 7 + 5 + 1,
    })
  })
})

describe('sortRoutes', () => {
  it('sorts by avance, highest first when asked', () => {
    const sorted = sortRoutes(rows, 'avancePct', 'desc')

    expect(sorted.map((item) => item.ruta)).toEqual(['06', '05', '04', '03'])
  })

  it('sorts the route code numerically, not as text', () => {
    const numbered = [row({ ruta: '10', cuentasRuta: 1, trabajadas: 0 }), row({ ruta: '9', cuentasRuta: 1, trabajadas: 0 })]

    expect(sortRoutes(numbered, 'ruta', 'asc').map((item) => item.ruta)).toEqual(['9', '10'])
  })
})

describe('filterRoutes', () => {
  it('matches the route, zona or filial text without accents or case', () => {
    const named = [
      { ...row({ ruta: '590-1-12', cuentasRuta: 1, trabajadas: 0 }), zona: 'Mercado Central' },
      row({ ruta: '590-1-11', cuentasRuta: 1, trabajadas: 0 }),
    ]

    expect(filterRoutes(named, 'mercado').map((item) => item.ruta)).toEqual(['590-1-12'])
    expect(filterRoutes(named, '1-11').map((item) => item.ruta)).toEqual(['590-1-11'])
    expect(filterRoutes(named, '')).toHaveLength(2)
  })
})

describe('routeName and rankingFileName', () => {
  it('joins the three codes of the route', () => {
    expect(routeName(row({ ruta: '03', cuentasRuta: 1, trabajadas: 0 }))).toBe('01 · 02 · 03')
  })

  it('names the ranking file by day', () => {
    expect(rankingFileName('xlsx', new Date(2026, 9, 28))).toBe('Cobertura-rutas-2026-10-28.xlsx')
  })
})
