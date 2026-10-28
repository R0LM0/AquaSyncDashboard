import { describe, expect, it } from 'vitest'
import type { Catalogs, ChangeRow, Filters, Summary, UserRouteProgress } from '@/domain/types'
import { buildPdfDocument, pdfFileName } from './pdfReport'
import { buildReportContent } from './reportContent'

const filters: Filters = { desde: '2026-09-28', hasta: '2026-10-27' }

const catalogs: Catalogs = {
  ugestiones: [],
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

const progress: UserRouteProgress[] = [
  {
    usuario: 'jmedina',
    filial: '01',
    zona: '02',
    ruta: '03',
    cuentasRuta: 100,
    cuentasTrabajadas: 25,
    fotos: 20,
    ubicaciones: 5,
    ultimaActividad: '2026-10-27T19:42:10Z',
  },
]

const changes: ChangeRow[] = [
  {
    id: '1',
    fecha: '2026-10-27T19:42:10Z',
    usuario: 'jmedina',
    cuenta: '5012',
    cliente: 'MARIA GONZALEZ',
    filial: '01',
    zona: '02',
    ruta: '03',
    tipoCambio: 'FotoNueva',
    origen: 'online',
  },
]

function content() {
  return buildReportContent({
    filters,
    catalogs,
    summary,
    progress,
    changes,
    daily: [],
    usuario: 'jmedina',
    generatedAt: new Date(2026, 9, 27, 21, 5),
    environment: 'PRUEBAS',
  })
}

describe('pdf report', () => {
  it('renders a cover plus one page per table', () => {
    const document_ = buildPdfDocument(content())

    // Cover + "Avance por ruta" + "Detalle de cambios".
    expect(document_.getNumberOfPages()).toBe(3)
  })

  it('produces a real PDF file', () => {
    const bytes = buildPdfDocument(content()).output('arraybuffer')

    expect(bytes.byteLength).toBeGreaterThan(1_000)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('names the file after the period', () => {
    expect(pdfFileName(content())).toBe(
      'AquaSync Catastro – Reporte 2026-09-28 a 2026-10-27.pdf',
    )
  })

  it('accepts chart snapshots without breaking', () => {
    const document_ = buildPdfDocument(content(), {
      daily: 'data:image/png;base64,AAA',
      donut: 'data:image/png;base64,AAA',
      routes: 'data:image/png;base64,AAA',
      logo: 'data:image/png;base64,AAA',
    })

    expect(document_.getNumberOfPages()).toBe(3)
  })
})
