import { chartSnapshot, logoPng } from './svgToPng'

export interface ReportCharts {
  daily?: string
  donut?: string
  routes?: string
  logo?: string
}

/** Waits for a paint, then rasterizes the three charts plus the logo. */
export async function captureReportCharts(): Promise<ReportCharts> {
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)))

  const [daily, donut, routes, logo] = await Promise.all([
    chartSnapshot('daily'),
    chartSnapshot('donut'),
    chartSnapshot('routes'),
    logoPng(),
  ])

  return { daily, donut, routes, logo }
}
