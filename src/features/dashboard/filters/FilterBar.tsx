import type { Catalogs, Filters } from '../../../domain/types'
import { narrowCatalogs } from '../../../domain/catalogs'
import { CHANGE_TYPE_LABELS, CHANGE_TYPES } from '../../../domain/labels'

export interface FilterBarProps {
  filters: Filters
  catalogs: Catalogs
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

export function FilterBar({ filters, catalogs, onChange, onReset }: FilterBarProps) {
  const narrowed = narrowCatalogs(catalogs, filters)

  return (
    <section className="filters no-print" aria-label="Filtros">
      <div className="filters__grid">
        <label className="field">
          <span>Unidad de gestión</span>
          <select
            value={filters.ugestionId ?? ''}
            onChange={(event) => onChange({ ugestionId: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {catalogs.ugestiones.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Sucursal</span>
          <select
            value={filters.sucursalId ?? ''}
            onChange={(event) => onChange({ sucursalId: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {narrowed.sucursales.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Filial</span>
          <select
            value={filters.filial ?? ''}
            onChange={(event) => onChange({ filial: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {catalogs.filiales.map((option) => (
              <option key={option.id} value={option.nombre}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Zona</span>
          <select
            value={filters.zona ?? ''}
            onChange={(event) => onChange({ zona: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {narrowed.zonas.map((option) => (
              <option key={option.id} value={option.nombre}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Ruta</span>
          <select
            value={filters.ruta ?? ''}
            onChange={(event) => onChange({ ruta: event.target.value || undefined })}
          >
            <option value="">Todas</option>
            {narrowed.rutas.map((option) => (
              <option key={option.id} value={option.nombre}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Usuario</span>
          <select
            value={filters.usuario ?? ''}
            onChange={(event) => onChange({ usuario: event.target.value || undefined })}
          >
            <option value="">Todos</option>
            {catalogs.usuarios.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Tipo de cambio</span>
          <select
            value={filters.tipoCambio ?? ''}
            onChange={(event) =>
              onChange({ tipoCambio: (event.target.value || undefined) as Filters['tipoCambio'] })
            }
          >
            <option value="">Todos</option>
            {CHANGE_TYPES.map((tipo) => (
              <option key={tipo} value={tipo}>
                {CHANGE_TYPE_LABELS[tipo]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Desde</span>
          <input
            type="date"
            value={filters.desde}
            max={filters.hasta}
            onChange={(event) => onChange({ desde: event.target.value || filters.desde })}
          />
        </label>

        <label className="field">
          <span>Hasta</span>
          <input
            type="date"
            value={filters.hasta}
            min={filters.desde}
            onChange={(event) => onChange({ hasta: event.target.value || filters.hasta })}
          />
        </label>

        <div className="field field--actions">
          <button type="button" className="button button--ghost" onClick={onReset}>
            Restablecer
          </button>
        </div>
      </div>
    </section>
  )
}
