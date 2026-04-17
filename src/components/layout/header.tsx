import { ConnectionIndicator } from './connection-indicator'
import { StationSwitcher } from '@/features/station/components/station-switcher'
import { ThemeSwitcher } from './theme-switcher'

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="hud-title text-primary">[ FMODECK ]</span>
          <span className="hud-mono text-xs text-muted-foreground">v0.1.0</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <StationSwitcher />
          <ConnectionIndicator />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
