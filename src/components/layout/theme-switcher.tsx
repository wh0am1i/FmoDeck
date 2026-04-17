import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '@/app/providers/theme-context'
import { cn } from '@/lib/utils'
import { Monitor, Moon, Sun } from 'lucide-react'

const OPTIONS: { key: Theme; labelKey: string; icon: typeof Sun }[] = [
  { key: 'light', labelKey: 'theme.light', icon: Sun },
  { key: 'dark', labelKey: 'theme.dark', icon: Moon },
  { key: 'system', labelKey: 'theme.system', icon: Monitor }
]

/**
 * 3 态分段控件显示当前主题。替代原来的"单按钮循环切换"，
 * 让用户一眼看出当前处于哪一档。
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.light')}
      className="flex items-center gap-0.5 rounded-sm border border-border p-0.5"
    >
      {OPTIONS.map(({ key, labelKey, icon: Icon }) => {
        const active = theme === key
        const label = t(labelKey)
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
