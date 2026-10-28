import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]',
  {
    variants: {
      tone: {
        primary: 'border-primary/35 bg-primary/12 text-primary',
        accent: 'border-accent/40 bg-accent/15 text-accent',
        success: 'border-success/35 bg-success/12 text-success',
        warning: 'border-warning/40 bg-warning/15 text-warning',
        violet: 'border-violet-500/40 bg-violet-500/15 text-violet-500',
        info: 'border-sky-500/40 bg-sky-500/15 text-sky-500',
        neutral: 'border-border-subtle bg-surface-2 text-muted-fg',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)
