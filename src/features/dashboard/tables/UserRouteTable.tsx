import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { UserRouteProgress } from '@/domain/types'
import { formatDateTime, formatPercent } from '@/shared/format'
import { cn } from '@/lib/utils'
import { EmptyState } from '../EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

type SortKey =
  | 'usuario'
  | 'filial'
  | 'zona'
  | 'ruta'
  | 'cuentasRuta'
  | 'cuentasTrabajadas'
  | 'fotos'
  | 'ubicaciones'
  | 'ultimaActividad'
  | 'avance'

interface TableRow extends UserRouteProgress {
  avance: number
}

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'usuario', label: 'Usuario' },
  { key: 'filial', label: 'Filial' },
  { key: 'zona', label: 'Zona' },
  { key: 'ruta', label: 'Ruta' },
  { key: 'cuentasRuta', label: 'Cuentas ruta', numeric: true },
  { key: 'cuentasTrabajadas', label: 'Trabajadas', numeric: true },
  { key: 'fotos', label: 'Fotos', numeric: true },
  { key: 'ubicaciones', label: 'Ubicaciones', numeric: true },
  { key: 'avance', label: 'Avance', numeric: true },
  { key: 'ultimaActividad', label: 'Última actividad' },
]

export function UserRouteTable({
  progress,
  loading,
  onSelectRoute,
}: {
  progress: UserRouteProgress[]
  loading?: boolean
  /** When given, a row opens that route's coverage; without it the rows stay static. */
  onSelectRoute?: (row: UserRouteProgress) => void
}) {
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'avance',
    direction: 'desc',
  })

  const rows = useMemo<TableRow[]>(() => {
    const withProgress = progress.map((row) => ({
      ...row,
      avance: row.cuentasRuta > 0 ? Math.round((row.cuentasTrabajadas / row.cuentasRuta) * 100) : 0,
    }))

    return withProgress.sort((a, b) => {
      const left = a[sort.key]
      const right = b[sort.key]
      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right))
      return sort.direction === 'asc' ? result : -result
    })
  }, [progress, sort])

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'usuario' || key === 'ruta' ? 'asc' : 'desc' },
    )
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (progress.length === 0) {
    return (
      <EmptyState
        title="Sin cambios en el período"
        detail="Ningún usuario trabajó con los filtros actuales."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'border-b border-border-subtle bg-surface-2/60 px-2 py-2 whitespace-nowrap',
                  column.numeric && 'text-right',
                )}
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-primary"
                >
                  {column.label}
                  {sort.key === column.key ? (
                    sort.direction === 'asc' ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    )
                  ) : null}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.usuario}-${row.ruta}`}
              className={cn(
                'transition-colors hover:bg-surface-2/70',
                onSelectRoute && 'cursor-pointer focus-visible:bg-surface-2/70 focus-visible:outline-none',
              )}
              tabIndex={onSelectRoute ? 0 : undefined}
              onClick={onSelectRoute ? () => onSelectRoute(row) : undefined}
              onKeyDown={
                onSelectRoute
                  ? (event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onSelectRoute(row)
                    }
                  : undefined
              }
            >
              <td className="border-b border-border-subtle px-2 py-2 text-xs font-semibold text-fg">
                {row.usuario}
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">{row.filial}</td>
              <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">{row.zona}</td>
              <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">{row.ruta}</td>
              <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                {row.cuentasRuta}
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                {row.cuentasTrabajadas}
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                {row.fotos}
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                {row.ubicaciones}
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                <span className="inline-flex items-center gap-2">
                  <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-surface-2 sm:block">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${row.avance}%` }}
                      aria-hidden="true"
                    />
                  </span>
                  {formatPercent(row.avance)}
                </span>
              </td>
              <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                {formatDateTime(row.ultimaActividad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
