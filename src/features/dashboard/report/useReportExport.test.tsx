import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Catalogs, ChangeRow, Filters, Summary } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { buildExcelWorkbook } from './excelReport'
import { useReportExport } from './useReportExport'

vi.mock('./excelReport', () => ({
  buildExcelWorkbook: vi.fn(() => ({
    xlsx: { writeBuffer: async () => new ArrayBuffer(16) },
  })),
  excelFileName: () => 'reporte.xlsx',
}))

vi.mock('./svgToPng', () => ({ logoPng: async () => undefined }))

const filters: Filters = {
  ugestionId: '1',
  desde: '2026-09-28',
  hasta: '2026-10-27',
}

const catalogs: Catalogs = {
  ugestiones: [{ id: '1', nombre: 'Unidad de Gestión Managua' }],
  sucursales: [],
  filiales: [],
  zonas: [],
  rutas: [],
  usuarios: [],
}

const summary: Summary = {
  cuentasTrabajadas: 10,
  fotosNuevas: 5,
  fotosActualizadas: 2,
  ubicaciones: 1,
  usuariosActivos: 2,
  avanceRutaPct: 20,
}

function change(index: number): ChangeRow {
  return {
    id: String(index),
    fecha: '2026-10-27T10:00:00Z',
    usuario: 'jmedina',
    cuenta: String(5000 + index),
    cliente: 'CLIENTE',
    filial: '01',
    zona: '02',
    ruta: '03',
    tipoCambio: 'FotoNueva',
    origen: 'online',
  }
}

function renderExport(rows: ChangeRow[]) {
  const api = {
    allChanges: vi.fn(async () => rows),
    summary: vi.fn(async () => summary),
  } as unknown as DashboardApi

  const view = renderHook(() =>
    useReportExport({
      api,
      filters,
      catalogs,
      summary,
      progress: [],
      daily: [],
      usuario: 'jmedina',
      environment: 'PRUEBAS',
    }),
  )

  return { api, ...view }
}

describe('useReportExport', () => {
  beforeEach(() => {
    vi.mocked(buildExcelWorkbook).mockClear()
  })

  it('builds the Excel with the current filters and reports the toast', async () => {
    const { result } = renderExport([change(1), change(2)])

    act(() => result.current.exportReport('excel'))

    await waitFor(() => expect(buildExcelWorkbook).toHaveBeenCalledTimes(1))

    const content = vi.mocked(buildExcelWorkbook).mock.calls[0][0]
    expect(content.filters).toContainEqual({ label: 'Unidad de gestión', value: 'Unidad de Gestión Managua' })
    expect(content.changes).toHaveLength(2)
    expect(content.changes[0].fecha).toBeInstanceOf(Date)
    expect(content.meta.environment).toBe('PRUEBAS')

    await waitFor(() => expect(result.current.toast).toContain('Excel'))
    expect(result.current.busy).toBeNull()
    expect(result.current.warning).toBeNull()
  })

  it('warns above 20,000 rows without blocking the export', async () => {
    const rows = Array.from({ length: 20_001 }, (_, index) => change(index))
    const { result } = renderExport(rows)

    act(() => result.current.exportReport('excel'))

    await waitFor(() => expect(result.current.warning).toContain('20,001'))
    expect(result.current.warning).toMatch(/período|filtros/)
    await waitFor(() => expect(buildExcelWorkbook).toHaveBeenCalledTimes(1))
  })

  it('reports an error without leaving the spinner on', async () => {
    const api = {
      allChanges: vi.fn(async () => {
        throw new Error('La API respondió 400')
      }),
      summary: vi.fn(async () => summary),
    } as unknown as DashboardApi

    const { result } = renderHook(() =>
      useReportExport({
        api,
        filters,
        catalogs,
        summary,
        progress: [],
        daily: [],
        usuario: 'jmedina',
        environment: 'PRUEBAS',
      }),
    )

    act(() => result.current.exportReport('excel'))

    await waitFor(() => expect(result.current.error).toBe('La API respondió 400'))
    expect(result.current.busy).toBeNull()
  })
})
