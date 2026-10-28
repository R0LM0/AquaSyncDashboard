import { useCallback, useEffect, useRef, useState } from 'react'
import { isSessionExpired } from '@/domain/errors'
import type {
  Catalogs,
  DailyProgress,
  Filters,
  Summary,
  UserRouteProgress,
} from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import type { ReportKind } from './ExportMenu'
import type { ReportContent } from './reportContent'
import type { ReportCharts } from './snapshots'
import { downloadBlob } from './download'

export interface UseReportExportOptions {
  api: DashboardApi
  filters: Filters
  catalogs: Catalogs
  summary: Summary
  progress: UserRouteProgress[]
  daily: DailyProgress[]
  usuario: string
  environment: string
  onSessionExpired?: () => void
}

export interface ReportExportState {
  busy: ReportKind | null
  warning: string | null
  toast: string | null
  error: string | null
  exportReport: (kind: ReportKind) => void
  /** True while the off-screen charts must be mounted for the PDF snapshots. */
  chartsActive: boolean
  onChartsReady: () => void
}

export function useReportExport(options: UseReportExportOptions): ReportExportState {
  const { api, filters, catalogs, summary, progress, daily, usuario, environment, onSessionExpired } =
    options

  const [busy, setBusy] = useState<ReportKind | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingPdf, setPendingPdf] = useState<ReportContent | null>(null)
  const [charts, setCharts] = useState<ReportCharts | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current)
    },
    [],
  )

  const notify = useCallback((message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4_500)
  }, [])

  const fail = useCallback(
    (caught: unknown) => {
      if (isSessionExpired(caught)) {
        onSessionExpired?.()
        return
      }
      setError(caught instanceof Error ? caught.message : 'No se pudo generar el reporte')
    },
    [onSessionExpired],
  )

  const loadContent = useCallback(async (): Promise<ReportContent> => {
    const [{ buildReportContent, rowLimitWarning }, changes, freshSummary] = await Promise.all([
      import('./reportContent'),
      api.allChanges(filters),
      api.summary(filters),
    ])

    setWarning(rowLimitWarning(changes.length))

    return buildReportContent({
      filters,
      catalogs,
      summary: freshSummary ?? summary,
      progress,
      changes,
      daily,
      usuario,
      generatedAt: new Date(),
      environment,
    })
  }, [api, catalogs, daily, environment, filters, progress, summary, usuario])

  const exportExcel = useCallback(async () => {
    setBusy('excel')
    setError(null)
    try {
      const content = await loadContent()
      const [{ buildExcelWorkbook, excelFileName }, { logoPng }] = await Promise.all([
        import('./excelReport'),
        import('./svgToPng'),
      ])
      const workbook = buildExcelWorkbook(content, { logoPng: await logoPng() })
      const buffer = await workbook.xlsx.writeBuffer()

      downloadBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        excelFileName(content),
      )
      notify('Reporte Excel generado')
    } catch (caught) {
      fail(caught)
    } finally {
      setBusy(null)
    }
  }, [fail, loadContent, notify])

  const exportPdf = useCallback(async () => {
    setBusy('pdf')
    setError(null)
    try {
      const content = await loadContent()
      setCharts(null)
      setPendingPdf(content)
    } catch (caught) {
      fail(caught)
      setBusy(null)
    }
  }, [fail, loadContent])

  const handleChartsMounted = useCallback(async () => {
    const { captureReportCharts } = await import('./snapshots')
    setCharts(await captureReportCharts())
  }, [])

  useEffect(() => {
    if (!pendingPdf || !charts) return

    let cancelled = false

    void (async () => {
      try {
        const { buildPdfDocument, pdfFileName } = await import('./pdfReport')
        const document_ = buildPdfDocument(pendingPdf, charts)
        document_.save(pdfFileName(pendingPdf))
        if (!cancelled) notify('Reporte PDF generado')
      } catch (caught) {
        if (!cancelled) fail(caught)
      } finally {
        if (!cancelled) {
          setBusy(null)
          setPendingPdf(null)
          setCharts(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [charts, fail, notify, pendingPdf])

  const exportReport = useCallback(
    (kind: ReportKind) => {
      void (kind === 'excel' ? exportExcel() : exportPdf())
    },
    [exportExcel, exportPdf],
  )

  return {
    busy,
    warning,
    toast,
    error,
    exportReport,
    chartsActive: pendingPdf !== null,
    onChartsReady: handleChartsMounted,
  }
}
