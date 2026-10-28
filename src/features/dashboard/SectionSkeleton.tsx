import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Shell-shaped placeholder: keeps the layout still while a section arrives. */
export function SectionSkeleton() {
  return (
    <div className="space-y-3" data-testid="section-skeleton" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-7 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-[260px] w-full" />
          </Card>
        ))}
      </div>
      <Card className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[320px] w-full" />
      </Card>
    </div>
  )
}
