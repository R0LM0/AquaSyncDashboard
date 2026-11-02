import { jsPDF } from 'jspdf'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'
import type { ServiciosNuevos } from '@/domain/types'
import { formatNumber } from '@/shared/format'
import { REPORT_AUTHOR, formatReportDateTime } from '../report/reportContent'
import {
  drawFooters,
  drawKpiCards,
  drawReportBand,
  drawTable,
  lastTableBottom,
} from '../barrido/barridoPdf'

const PRIMARY = CHANGE_TYPE_COLORS.FotoNueva
const MAX_CARDS = 6
/** Rows printed in the PDF; the full list goes in the Excel. */
export const PDF_RECORD_LIMIT = 500

/** KPI cards, the registered services (newest first) and the devices that registered them. */
export function buildServiciosPdf(data: ServiciosNuevos, generatedAt: Date): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setProperties({
    title: 'Servicios nuevos',
    author: REPORT_AUTHOR,
    creator: REPORT_AUTHOR,
    keywords: 'SIGIL, catastro, AquaSync, ENACAL, servicios nuevos',
  })

  drawReportBand(doc, 'Servicios nuevos', '', generatedAt)
  drawKpiCards(
    doc,
    [
      { label: 'Registrados', value: formatNumber(data.resumen.registrados), color: PRIMARY },
      { label: 'Hoy', value: formatNumber(data.resumen.hoy), color: PRIMARY },
      ...data.resumen.porEstado
        .slice(0, MAX_CARDS - 2)
        .map((row) => ({ label: row.estado || 'Sin estado', value: formatNumber(row.cantidad), color: PRIMARY })),
    ],
    34,
  )

  const shown = data.registros.slice(0, PDF_RECORD_LIMIT)
  drawTable(
    doc,
    62,
    ['Fecha', 'Usuario', 'Alias', 'Modelo', 'Estado', 'Sucursal', 'Cliente'],
    shown.map((row) => [
      formatReportDateTime(new Date(row.fecha)),
      row.usuario,
      row.alias,
      row.modelo || '—',
      row.estado || '—',
      row.sucursal || '—',
      row.cliente || '—',
    ]),
  )

  drawTable(
    doc,
    lastTableBottom(doc) + 10,
    ['Usuario', 'Alias', 'Modelo', 'Versión', 'Registros', 'Primera', 'Última'],
    data.dispositivos.map((device) => [
      device.usuario,
      device.alias,
      device.modelo || '—',
      device.appVersion || '—',
      formatNumber(device.cantidad),
      device.primera ? formatReportDateTime(new Date(device.primera)) : '—',
      device.ultima ? formatReportDateTime(new Date(device.ultima)) : '—',
    ]),
  )

  drawFooters(doc)
  return doc
}
