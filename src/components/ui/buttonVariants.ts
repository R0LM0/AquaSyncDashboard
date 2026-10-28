import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-fg shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.8)] hover:brightness-110 active:translate-y-px',
        secondary:
          'bg-surface-2 text-fg border border-border-subtle hover:bg-surface-3 active:translate-y-px',
        ghost: 'text-muted-fg hover:bg-surface-2 hover:text-fg',
        outline: 'border border-border-subtle text-fg hover:border-primary hover:text-primary',
        danger: 'bg-danger text-white hover:brightness-110 active:translate-y-px',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
