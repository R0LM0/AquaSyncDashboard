import { describe, expect, it } from 'vitest'
import type { RouteCoverage } from '@/domain/types'
import { buildCoverageWorkbook } from './coverageExcel'
import { buildCoveragePdf } from './coveragePdf'
import { coverageFileName } from './coverageAggregates'

const coverage: RouteCoverage = {
  filial: '590',
  zona: '1',
  ruta: '12',
  cuentasRuta: 3,
  trabajadas: 1,
  pendientes: 1,
  fueraDeRuta: 1,
  avancePct: 33.3,
  cuentas: [
    {
      cuenta: '1001',
      cliente: 'Pulpería La Esquina',
      direccion: 'Calle 1',
      estado: 'trabajada',
      usuario: 'jperez',
      primeraActividad: '2026-10-27T14:00:00Z',
      ultimaActividad: '2026-10-27T15:00:00Z',
      fotos: 2,
      ubicaciones: 1,
      lat: 12.1,
      lng: -86.2,
    },
    {
      cuenta: '1002',
      cliente: '',
      direccion: '',
      estado: 'pendiente',
      usuario: null,
      primeraActividad: null,
      ultimaActividad: null,
      fotos: 0,
      ubicaciones: 0,
      lat: null,
      lng: null,
    },
    {
      cuenta: '1003',
      cliente: 'Taller',
      direccion: 'Km 3',
      estado: 'fuera_de_ruta',
      usuario: 'mlopez',
      primeraActividad: '2026-10-26T10:00:00Z',
      ultimaActividad: '2026-10-26T10:00:00Z',
      fotos: 0,
      ubicaciones: 1,
      lat: null,
      lng: null,
    },
  ],
}

describe('coverage exports', () => {
  it('builds the Resumen, Pendientes and Trabajadas sheets', () => {
    const workbook = buildCoverageWorkbook(coverage, new Date(2026, 9, 28))

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Pendientes', 'Trabajadas'])
    expect(workbook.getWorksheet('Pendientes')?.rowCount).toBe(2)
    expect(workbook.getWorksheet('Trabajadas')?.rowCount).toBe(2)
  })

  it('builds a PDF with the pending list and a file name per route and day', () => {
    const generatedAt = new Date(2026, 9, 28)
    const pdf = buildCoveragePdf(coverage, generatedAt)

    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(coverageFileName(coverage, generatedAt, 'pdf')).toBe('Cobertura-ruta-590_1_12-2026-10-28.pdf')
  })
})
