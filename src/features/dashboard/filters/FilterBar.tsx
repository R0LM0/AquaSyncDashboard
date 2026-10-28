import { useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { narrowCatalogs } from '@/domain/catalogs'
import { activeFilterCount } from './activeFilterCount'
import { CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { Catalogs, Filters } from '@/domain/types'
import { cn } from '@/lib/utils'

export interface FilterBarProps {
  filters: Filters
  catalogs: Catalogs
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  /** Start collapsed on small screens. */
  defaultOpen?: boolean
}

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border-subtle bg-surface px-2.5 text-sm text-fg transition-colors focus:border-primary focus:outline-none'

export function FilterBar({ filters, catalogs, onChange, onReset, defaultOpen = false }: FilterBarProps) {
  const [open, setOpen] = useState(defaultOpen)
  const narrowed = narrowCatalogs(catalogs, filters)
  const active = activeFilterCount(filters)

  return (
    <section className="border-b border-border-subtle bg-surface/60 px-4 py-2.5 backdrop-blur sm:px-6 no-print" aria-label="Filtros">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <SlidersHorizontal />
          Filtros
          {active > 0 ? (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-fg">{active}</span>
          ) : null}
          <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
        </Button>

        <p className="hidden text-xs text-muted-fg md:block">
          {filters.desde} → {filters.hasta}
          {filters.ruta ? ` · ${filters.ruta}` : ''}
          {filters.usuario ? ` · ${filters.usuario}` : ''}
        </p>

        {active > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="ml-auto">
            <X />
            Limpiar
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="animate-fade-in mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Unidad de gestión">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Sucursal">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Filial">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Zona">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Ruta">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Usuario">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Tipo de cambio">
            <select
              className={SELECT_CLASS}
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
          </Field>

          <Field label="Desde">
            <input
              type="date"
              className={SELECT_CLASS}
              value={filters.desde}
              max={filters.hasta}
              onChange={(event) => onChange({ desde: event.target.value || filters.desde })}
            />
          </Field>

          <Field label="Hasta">
            <input
              type="date"
              className={SELECT_CLASS}
              value={filters.hasta}
              min={filters.desde}
              onChange={(event) => onChange({ hasta: event.target.value || filters.hasta })}
            />
          </Field>
        </div>
      ) : null}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">{label}</span>
      {children}
    </label>
  )
}
