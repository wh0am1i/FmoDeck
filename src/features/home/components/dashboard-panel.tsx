import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DashboardPanel({
  title,
  children,
  className
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-sm border border-primary/20 bg-background/40',
        className
      )}
    >
      <div className="flex items-center border-b border-primary/10 bg-card/40 px-3 py-1.5">
        <span className="hud-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
