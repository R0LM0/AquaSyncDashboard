import type { CoverageAccount, CoverageEstado, RouteCoverage } from '@/domain/types'
import { localDateKey } from '@/shared/dates'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Accounts of one tab matching the search by cuenta, número catastral, cliente or dirección. */
export function filterCoverageAccounts(
  accounts: CoverageAccount[],
  estado: CoverageEstado,
  query: string,
): CoverageAccount[] {
  const needle = normalize(query.trim())
  return accounts.filter((account) => {
    if (account.estado !== estado) return false
    if (!needle) return true
    return [account.cuenta, account.numeroCatastral, account.cliente, account.direccion].some((field) =>
      normalize(field).includes(needle),
    )
  })
}

export const ESTADO_LABELS: Record<CoverageEstado, string> = {
  trabajada: 'Trabajadas',
  pendiente: 'Pendientes',
  fuera_de_ruta: 'Fuera de ruta',
}

/** Trabajada green, pendiente red, fuera de ruta amber: the same on the map, the donut and the tables. */
export const ESTADO_COLORS: Record<CoverageEstado, string> = {
  trabajada: '#16a34a',
  pendiente: '#dc2626',
  fuera_de_ruta: '#d97706',
}

export interface CoverageDayPoint {
  /** Local day, YYYY-MM-DD. */
  dia: string
  trabajadas: number
}

export interface CoverageUserPoint {
  usuario: string
  trabajadas: number
}

export interface CoverageSlice {
  estado: CoverageEstado
  name: string
  value: number
  color: string
}

/** Worked accounts per local day of their first activity, oldest day first. */
export function workedPerDay(accounts: CoverageAccount[]): CoverageDayPoint[] {
  const perDay = new Map<string, number>()

  for (const account of accounts) {
    if (account.estado !== 'trabajada' || account.primeraActividad === null) continue
    const dia = localDateKey(new Date(account.primeraActividad))
    perDay.set(dia, (perDay.get(dia) ?? 0) + 1)
  }

  return [...perDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dia, trabajadas]) => ({ dia, trabajadas }))
}

/** Worked accounts per user (the last one who worked each account), most worked first. */
export function workedPerUser(accounts: CoverageAccount[]): CoverageUserPoint[] {
  const perUser = new Map<string, number>()

  for (const account of accounts) {
    if (account.estado !== 'trabajada' || !account.usuario) continue
    perUser.set(account.usuario, (perUser.get(account.usuario) ?? 0) + 1)
  }

  return [...perUser.entries()]
    .map(([usuario, trabajadas]) => ({ usuario, trabajadas }))
    .sort((left, right) => right.trabajadas - left.trabajadas || left.usuario.localeCompare(right.usuario))
}

/** Donut slices per estado; an estado without accounts has no slice. */
export function coverageSlices(accounts: CoverageAccount[]): CoverageSlice[] {
  const order: CoverageEstado[] = ['trabajada', 'pendiente', 'fuera_de_ruta']

  return order
    .map((estado) => ({
      estado,
      name: ESTADO_LABELS[estado],
      value: accounts.filter((account) => account.estado === estado).length,
      color: ESTADO_COLORS[estado],
    }))
    .filter((slice) => slice.value > 0)
}

/** The route in the view: the coverage's own identity, for the title and the file names. */
export function routeLabel(route: Pick<RouteCoverage, 'filial' | 'zona' | 'ruta'>): string {
  return [route.filial, route.zona, route.ruta].filter(Boolean).join(' · ')
}

/** Downloaded file name, the same shape for the Excel and the PDF: Cobertura-ruta-<filial>_<zona>_<ruta>-<día>.<ext>. */
export function coverageFileName(
  route: Pick<RouteCoverage, 'filial' | 'zona' | 'ruta'>,
  generatedAt: Date,
  extension: 'xlsx' | 'pdf',
): string {
  const safe = [route.filial, route.zona, route.ruta].map((part) => part.replace(/[^\w-]+/g, '-')).join('_')
  return `Cobertura-ruta-${safe}-${localDateKey(generatedAt)}.${extension}`
}
