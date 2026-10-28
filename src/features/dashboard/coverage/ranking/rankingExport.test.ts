import { describe, expect, it } from 'vitest'
import type { RouteRankingRow } from '@/domain/types'
import { buildRankingWorkbook } from './rankingExcel'
import { buildRankingPdf } from './rankingPdf'

const rows: RouteRankingRow[] = [
  { filial: '01', zona: '02', ruta: '03', cuentasRuta: 10, trabajadas: 0, pendientes: 10, avancePct: 0, usuarios: 0, ultimaActividad: null },
  { filial: '01', zona: '02', ruta: '04', cuentasRuta: 10, trabajadas: 9, pendientes: 1, avancePct: 90, usuarios: 2, ultimaActividad: '2026-10-27T15:00:00Z' },
]

describe('ranking exports', () => {
  it('builds a Resumen and a Rutas sheet with one row per route', () => {
    const workbook = buildRankingWorkbook(rows, new Date(2026, 9, 28))

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Rutas'])
    expect(workbook.getWorksheet('Rutas')?.rowCount).toBe(3)
  })

  it('builds a PDF of the ranking', () => {
    expect(buildRankingPdf(rows, new Date(2026, 9, 28)).getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
