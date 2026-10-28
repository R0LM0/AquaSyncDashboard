import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
}

export function Input({ className, icon, trailing, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <input
        className={cn(
          'h-11 w-full rounded-xl border border-border-subtle bg-surface-2/60 px-3 text-sm text-fg placeholder:text-muted-fg/70',
          'transition-colors focus:border-primary focus:bg-surface focus:outline-none',
          icon && 'pl-10',
          trailing && 'pr-11',
          className,
        )}
        {...props}
      />
      {trailing ? <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span> : null}
    </div>
  )
}
