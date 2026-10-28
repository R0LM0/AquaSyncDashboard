import { useMemo, useState } from 'react'
import type { UserRouteProgress } from '../../../domain/types'
import { formatDateTime, formatPercent } from '../../../shared/format'

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

const columns: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
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

export function UserRouteTable({ progress }: { progress: UserRouteProgress[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'avance',
    direction: 'desc',
  })

  const rows = useMemo<TableRow[]>(() => {
    const withProgress = progress.map((row) => ({
      ...row,
      avance:
        row.cuentasRuta > 0 ? Math.round((row.cuentasTrabajadas / row.cuentasRuta) * 100) : 0,
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

  if (progress.length === 0) {
    return <p className="empty">Ningún usuario trabajó con los filtros actuales.</p>
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.numeric ? 'is-numeric' : undefined}
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <button type="button" className="table__sort" onClick={() => toggleSort(column.key)}>
                  {column.label}
                  {sort.key === column.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.usuario}-${row.ruta}`}>
              <td>{row.usuario}</td>
              <td>{row.filial}</td>
              <td>{row.zona}</td>
              <td>{row.ruta}</td>
              <td className="is-numeric">{row.cuentasRuta}</td>
              <td className="is-numeric">{row.cuentasTrabajadas}</td>
              <td className="is-numeric">{row.fotos}</td>
              <td className="is-numeric">{row.ubicaciones}</td>
              <td className="is-numeric">
                <span className="progress">
                  <span className="progress__bar" style={{ width: `${row.avance}%` }} aria-hidden="true" />
                </span>
                {formatPercent(row.avance)}
              </td>
              <td>{formatDateTime(row.ultimaActividad)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
