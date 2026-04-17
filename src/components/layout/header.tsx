import { ConnectionIndicator } from './connection-indicator'
import { StationSwitcher } from '@/features/station/components/station-switcher'
import { LanguageSwitcher } from './language-switcher'
import { ThemeSwitcher } from './theme-switcher'

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="hud-title whitespace-nowrap text-primary">[ FMODECK ]</span>
          <span className="hud-mono hidden text-xs text-muted-foreground sm:inline">v0.1.1</span>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-x-2 gap-y-2 md:gap-x-4">
          <StationSwitcher />
          <ConnectionIndicator />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
