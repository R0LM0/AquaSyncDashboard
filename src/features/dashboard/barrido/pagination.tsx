import { useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/shared/format'

export const PAGE_SIZES = [10, 25, 50] as const
export const DEFAULT_PAGE_SIZE = 25

export interface PageSlice<T> {
  rows: T[]
  page: number
  pageSize: number
  totalPages: number
  total: number
  /** 1-based range shown; 0 when empty. */
  from: number
  to: number
}

/** One page of `rows`; a page out of range is clamped. */
export function paginate<T>(rows: T[], page: number, pageSize: number): PageSlice<T> {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (current - 1) * pageSize
  const slice = rows.slice(start, start + pageSize)
  return {
    rows: slice,
    page: current,
    pageSize,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  }
}

/** Page and size state; the page returns to 1 whenever `resetKey` (search, filter, data set) changes. */
export function usePager(resetKey: string, initialSize: number = DEFAULT_PAGE_SIZE) {
  const [state, setState] = useState({ page: 1, pageSize: initialSize, key: resetKey })
  const page = state.key === resetKey ? state.page : 1
  const setPage = useCallback((next: number) => setState((s) => ({ ...s, page: next, key: resetKey })), [resetKey])
  const setPageSize = useCallback((size: number) => setState({ page: 1, pageSize: size, key: resetKey }), [resetKey])
  return { page, pageSize: state.pageSize, setPage, setPageSize }
}

export interface PagerProps {
  /** Names the table for assistive technology. */
  label: string
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}

/** First, previous, next, last, "Página x de y" and a 10/25/50 selector. */
export function Pager({ label, page, pageSize, total, onPage, onPageSize }: PagerProps) {
  if (total === 0) return null
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  const from = (current - 1) * pageSize + 1
  const to = Math.min(total, current * pageSize)

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-fg no-print"
      aria-label={`Paginación de ${label}`}
    >
      <p aria-live="polite">
        Página {formatNumber(current)} de {formatNumber(totalPages)} · {formatNumber(from)}–{formatNumber(to)} de{' '}
        {formatNumber(total)}
      </p>
      <div className="flex items-center gap-1.5">
        <label className="mr-2 inline-flex items-center gap-1.5">
          <span>Filas</span>
          <select
            aria-label="Filas por página"
            className="h-8 rounded-lg border border-border-subtle bg-surface px-1.5 text-xs font-semibold text-fg focus-visible:outline-2 focus-visible:outline-primary"
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" aria-label="Primera página" disabled={current <= 1} onClick={() => onPage(1)}>
          <ChevronsLeft aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" aria-label="Página anterior" disabled={current <= 1} onClick={() => onPage(current - 1)}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" aria-label="Página siguiente" disabled={current >= totalPages} onClick={() => onPage(current + 1)}>
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" aria-label="Última página" disabled={current >= totalPages} onClick={() => onPage(totalPages)}>
          <ChevronsRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
