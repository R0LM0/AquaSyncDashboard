import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Static shimmer under reduced motion (see index.css). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer rounded-lg', className)} {...props} />
}
