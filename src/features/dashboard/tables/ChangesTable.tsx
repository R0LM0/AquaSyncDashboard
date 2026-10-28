import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '@/domain/labels'
import type { ChangeRow, Page } from '@/domain/types'
import { formatDateTime, formatNumber } from '@/shared/format'
import { Button } from '@/components/ui/button'
import { EmptyState } from '../EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export interface ChangesTableProps {
  page?: Page<ChangeRow>
  pageNumber: number
  pageSize: number
  onPageChange: (page: number) => void
  /** A 400 or 503 isolated to this endpoint must not disappear silently. */
  error?: string
  loading?: boolean
}

export function ChangesTable({
  page,
  pageNumber,
  pageSize,
  onPageChange,
  error,
  loading,
}: ChangesTableProps) {
  const total = page?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
      >
        {error}
      </p>
    )
  }

  if (loading && !page) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (page && page.rows.length === 0) {
    return (
      <EmptyState
        title="Sin cambios en el período"
        detail="Ajustá los filtros o ampliá el rango de fechas."
      />
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">
              {['Fecha', 'Usuario', 'Cuenta', 'Cliente', 'Filial', 'Zona', 'Ruta', 'Tipo de cambio', 'Origen'].map(
                (header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap border-b border-border-subtle bg-surface-2/60 px-2.5 py-2"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {(page?.rows ?? []).map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-surface-2/70">
                <td className="whitespace-nowrap border-b border-border-subtle px-2.5 py-2 text-xs text-muted-fg">
                  {formatDateTime(row.fecha)}
                </td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs font-semibold text-fg">
                  {row.usuario}
                </td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-fg">{row.cuenta}</td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-fg">{row.cliente}</td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-muted-fg">{row.filial}</td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-muted-fg">{row.zona}</td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-muted-fg">{row.ruta}</td>
                <td className="border-b border-border-subtle px-2.5 py-2">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-fg">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: CHANGE_TYPE_COLORS[row.tipoCambio] }}
                      aria-hidden="true"
                    />
                    {CHANGE_TYPE_LABELS[row.tipoCambio]}
                  </span>
                </td>
                <td className="border-b border-border-subtle px-2.5 py-2 text-xs text-muted-fg">{row.origen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-fg no-print" aria-label="Paginación del detalle">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageNumber <= 1}
        >
          Anterior
        </Button>
        <span>
          Página {formatNumber(pageNumber)} de {formatNumber(totalPages)} · {formatNumber(total)} cambios
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
        >
          Siguiente
        </Button>
      </nav>
    </div>
  )
}
