import { Inbox, type LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  detail,
}: {
  icon?: LucideIcon
  title: string
  detail?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted-fg">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {detail ? <p className="max-w-sm text-xs text-muted-fg">{detail}</p> : null}
    </div>
  )
}
