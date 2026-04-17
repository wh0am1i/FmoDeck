import { useTheme } from '@/app/providers/theme-context'
import { Button } from '@/components/ui/button'
import { ConnectionIndicator } from './connection-indicator'
import { Monitor, Moon, Sun } from 'lucide-react'

export function Header() {
  const { theme, setTheme } = useTheme()

  const next = (): void => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="hud-title text-primary">[ FMODECK ]</span>
          <span className="hud-mono text-xs text-muted-foreground">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionIndicator />
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            aria-label={`切换主题（当前：${theme}）`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
