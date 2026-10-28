/** Placeholder while a lazy chunk (map or chart) loads. */
export function Skeleton({ height = 300, label }: { height?: number; label: string }) {
  return (
    <div className="skeleton" style={{ height }} role="status" aria-label={label}>
      <span className="skeleton__bar" />
      <span className="skeleton__bar skeleton__bar--short" />
      <span className="skeleton__bar" />
    </div>
  )
}
