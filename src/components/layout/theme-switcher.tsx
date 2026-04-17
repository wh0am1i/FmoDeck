import { useTheme, type Theme } from '@/app/providers/theme-context'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'

const OPTIONS: { key: Theme; label: string; icon: typeof Sun }[] = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'dark', label: '深色', icon: Moon },
  { key: 'system', label: '跟随系统', icon: Monitor }
]

/**
 * 3 态分段控件显示当前主题。替代原来的"单按钮循环切换"，
 * 让用户一眼看出当前处于哪一档。
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="主题"
      className="flex items-center gap-0.5 rounded-sm border border-border p-0.5"
    >
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = theme === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(key)}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-sm transition-colors',
              active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
