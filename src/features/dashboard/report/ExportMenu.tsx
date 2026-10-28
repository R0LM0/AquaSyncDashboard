import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CHANGE_TYPE_COLORS } from '@/domain/labels'

export type ReportKind = 'excel' | 'pdf'

export interface ExportMenuProps {
  busy: ReportKind | null
  warning?: string | null
  onExport: (kind: ReportKind) => void
}

/** One "Exportar" button with the two formats behind it. */
export function ExportMenu({ busy, warning, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false)

  const choose = (kind: ReportKind) => {
    setOpen(false)
    onExport(kind)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button type="button" disabled={busy !== null} data-testid="export-trigger">
          {busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
          {busy ? 'Generando reporte…' : 'Exportar'}
          <ChevronDown />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-[600] w-64 rounded-xl border border-border-subtle bg-surface p-2 text-xs shadow-panel data-[state=open]:animate-fade-in"
          data-testid="export-menu"
        >
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => choose('excel')}
              className="flex items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
            >
              <FileSpreadsheet
                className="mt-0.5 size-4"
                style={{ color: CHANGE_TYPE_COLORS.FotoActualizada }}
                aria-hidden="true"
              />
              <span>
                <span className="block font-bold text-fg">Excel</span>
                <span className="block text-[11px] text-muted-fg">
                  Resumen, avance por ruta, detalle y actividad diaria con formato.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => choose('pdf')}
              className="flex items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
            >
              <FileText
                className="mt-0.5 size-4"
                style={{ color: CHANGE_TYPE_COLORS.FotoNueva }}
                aria-hidden="true"
              />
              <span>
                <span className="block font-bold text-fg">PDF</span>
                <span className="block text-[11px] text-muted-fg">
                  Portada con gráficos y las tablas listas para imprimir.
                </span>
              </span>
            </button>
          </div>

          {warning ? (
            <p
              className="mt-2 rounded-lg border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] font-semibold text-accent"
              data-testid="export-warning"
            >
              {warning}
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
