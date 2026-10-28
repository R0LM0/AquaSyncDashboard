import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  /** Visible label; also the accessible name of the field. */
  label: string
  /** Selected value, `undefined` for the "all" option. */
  value: string | undefined
  options: ComboboxOption[]
  /** The first option, which clears the filter: "Todas" or "Todos". */
  allLabel: string
  onChange: (value: string | undefined) => void
  disabled?: boolean
  /** Fixed by the user's scope: disabled, with a lock and the hint as tooltip. */
  locked?: boolean
  lockedHint?: string
}

const LOCKED_HINT = 'Asignado a tu usuario'

/** Case and accent insensitive, so "leon" finds "León". */
function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

const TRIGGER_CLASS =
  'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface px-2.5 text-left text-sm text-fg transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-70'

/**
 * A select with a search box: a Radix popover holding an input and a listbox.
 * Keyboard: ArrowUp/ArrowDown move, Enter chooses, Escape closes.
 */
export function Combobox({
  label,
  value,
  options,
  allLabel,
  onChange,
  disabled = false,
  locked = false,
  lockedHint = LOCKED_HINT,
}: ComboboxProps) {
  const id = useId()
  const labelId = `${id}-label`
  const listId = `${id}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedLabel = value === undefined ? allLabel : options.find((option) => option.value === value)?.label ?? value

  // The "all" option is always first; it stays visible while searching.
  const items = useMemo<ComboboxOption[]>(() => {
    const needle = normalizeSearch(query)
    const matches = needle ? options.filter((option) => normalizeSearch(option.label).includes(needle)) : options
    return [{ value: '', label: allLabel }, ...matches]
  }, [allLabel, options, query])

  const activeIndex = Math.min(active, items.length - 1)

  function choose(item: ComboboxOption) {
    onChange(item.value === '' ? undefined : item.value)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => Math.min(current + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[activeIndex]
      if (item) choose(item)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1" title={locked ? lockedHint : undefined}>
      <span id={labelId} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-fg">
        {label}
        {locked ? <Lock className="size-3" aria-hidden="true" /> : null}
      </span>

      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setQuery('')
            setActive(0)
          }
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-labelledby={labelId}
            aria-controls={listId}
            disabled={disabled || locked}
            className={TRIGGER_CLASS}
          >
            <span className="truncate">{selectedLabel}</span>
            {locked ? (
              <Lock className="size-3.5 shrink-0 text-muted-fg" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5 shrink-0 text-muted-fg" aria-hidden="true" />
            )}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-[900] w-[var(--radix-popover-trigger-width)] min-w-56 max-w-80 rounded-xl border border-border-subtle bg-surface p-2 shadow-panel"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              searchRef.current?.focus()
            }}
          >
            <input
              ref={searchRef}
              type="text"
              aria-label={`Buscar ${label}`}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar…"
              className="mb-2 h-9 w-full rounded-lg border border-border-subtle bg-bg px-2.5 text-sm text-fg focus:border-primary focus:outline-none"
            />

            <ul
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className="max-h-64 overflow-y-auto"
            >
              {items.map((item, index) => {
                const isSelected = item.value === (value ?? '')
                return (
                  <li
                    key={item.value || '__all'}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(item)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-fg',
                      index === activeIndex && 'bg-primary/15',
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {isSelected ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                  </li>
                )
              })}
            </ul>

            {query && items.length === 1 ? (
              <p role="status" className="px-2.5 py-2 text-xs text-muted-fg">
                Sin coincidencias
              </p>
            ) : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
