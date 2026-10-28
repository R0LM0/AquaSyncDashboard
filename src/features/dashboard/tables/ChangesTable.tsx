import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '../../../domain/labels'
import type { Page, ChangeRow } from '../../../domain/types'
import { formatDateTime, formatNumber } from '../../../shared/format'

export interface ChangesTableProps {
  page?: Page<ChangeRow>
  pageNumber: number
  pageSize: number
  onPageChange: (page: number) => void
  /** A 400 or 503 isolated to this endpoint must not disappear silently. */
  error?: string
}

export function ChangesTable({
  page,
  pageNumber,
  pageSize,
  onPageChange,
  error,
}: ChangesTableProps) {
  const total = page?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (error) {
    return (
      <p className="alert alert--error" role="alert">
        {error}
      </p>
    )
  }

  if (page && page.rows.length === 0) {
    return <p className="empty">No hay cambios registrados con los filtros actuales.</p>
  }

  return (
    <div className="table-wrapper">
      <table className="table table--compact">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Cuenta</th>
            <th>Cliente</th>
            <th>Filial</th>
            <th>Zona</th>
            <th>Ruta</th>
            <th>Tipo de cambio</th>
            <th>Origen</th>
          </tr>
        </thead>
        <tbody>
          {(page?.rows ?? []).map((row) => (
            <tr key={row.id}>
              <td className="is-nowrap">{formatDateTime(row.fecha)}</td>
              <td>{row.usuario}</td>
              <td>{row.cuenta}</td>
              <td>{row.cliente}</td>
              <td>{row.filial}</td>
              <td>{row.zona}</td>
              <td>{row.ruta}</td>
              <td>
                <span className="type">
                  <span
                    className="type__dot"
                    style={{ background: CHANGE_TYPE_COLORS[row.tipoCambio] }}
                    aria-hidden="true"
                  />
                  {CHANGE_TYPE_LABELS[row.tipoCambio]}
                </span>
              </td>
              <td>{row.origen}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <nav className="pagination no-print" aria-label="Paginación del detalle">
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onPageChange(pageNumber - 1)}
          disabled={pageNumber <= 1}
        >
          Anterior
        </button>
        <span>
          Página {formatNumber(pageNumber)} de {formatNumber(totalPages)} ·{' '}
          {formatNumber(total)} cambios
        </span>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onPageChange(pageNumber + 1)}
          disabled={pageNumber >= totalPages}
        >
          Siguiente
        </button>
      </nav>
    </div>
  )
}
