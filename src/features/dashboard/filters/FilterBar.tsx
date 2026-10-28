import { useState } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  cascadeParents,
  lockedLevels,
  sucursalOptionsForScope,
  type CascadeLevel,
} from '@/domain/cascade'
import { CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { Alcance, CatalogOption, Filters } from '@/domain/types'
import { cn } from '@/lib/utils'
import { activeFilterCount } from './activeFilterCount'
import { Combobox, type ComboboxOption } from './Combobox'
import type { CascadeOptions } from './useCascadeOptions'

/** Every select's options: the cascade levels, and the users (flat catalog). */
export interface FilterBarOptions extends CascadeOptions {
  usuarios: CatalogOption[]
}

export interface FilterBarProps {
  filters: Filters
  options: FilterBarOptions
  /** The user's scope: its levels are shown fixed and locked. */
  alcance: Alcance
  /** A patch of the filters; the cascade clears the levels below a change. */
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
  /** Start collapsed on small screens. */
  defaultOpen?: boolean
}

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-border-subtle bg-surface px-2.5 text-sm text-fg transition-colors focus:border-primary focus:outline-none'

const CASCADE_FILTER: Record<CascadeLevel, keyof Filters> = {
  departamento: 'departamentoId',
  ugestion: 'ugestionId',
  ciudad: 'ciudadId',
  sucursal: 'sucursalId',
  filial: 'filial',
  zona: 'zona',
  ruta: 'ruta',
}

function toComboboxOptions(items: CatalogOption[]): ComboboxOption[] {
  return items.map((item) => ({ value: item.id, label: item.nombre }))
}

export function FilterBar({ filters, options, alcance, onChange, onReset, defaultOpen = false }: FilterBarProps) {
  const [open, setOpen] = useState(defaultOpen)
  const active = activeFilterCount(filters, alcance)
  const locked = new Set<CascadeLevel>(lockedLevels(alcance))

  /** A cascade level can be chosen only once its parents are; its filter key is patched. */
  const cascade = (level: CascadeLevel, items: CatalogOption[], allLabel: string, label: string) => (
    <Combobox
      label={label}
      value={filters[CASCADE_FILTER[level]] as string | undefined}
      options={toComboboxOptions(items)}
      allLabel={allLabel}
      disabled={cascadeParents(level, filters) === null}
      locked={locked.has(level)}
      onChange={(value) => onChange({ [CASCADE_FILTER[level]]: value })}
    />
  )

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
          {cascade('departamento', options.departamento, 'Todos', 'Departamento')}
          {cascade('ugestion', options.ugestion, 'Todas', 'Unidad de gestión')}
          {cascade('ciudad', options.ciudad, 'Todas', 'Ciudad')}
          {cascade('sucursal', sucursalOptionsForScope(options.sucursal, alcance), 'Todas', 'Sucursal')}
          {cascade('filial', options.filial, 'Todas', 'Filial')}
          {cascade('zona', options.zona, 'Todas', 'Zona')}
          {cascade('ruta', options.ruta, 'Todas', 'Ruta')}

          <Combobox
            label="Usuario"
            value={filters.usuario}
            options={toComboboxOptions(options.usuarios)}
            allLabel="Todos"
            onChange={(value) => onChange({ usuario: value })}
          />

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
