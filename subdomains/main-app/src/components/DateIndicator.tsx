type DateIndicatorProps = {
  dateLabel: string
}

export function DateIndicator({ dateLabel }: DateIndicatorProps) {
  return (
    <aside className="date-indicator" aria-live="polite" aria-label="Current project date">
      <span>{dateLabel}</span>
    </aside>
  )
}
