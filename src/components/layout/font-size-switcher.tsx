import { useTranslation } from 'react-i18next'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'

type FontSize = 'normal' | 'large'

const OPTIONS: { key: FontSize; labelKey: string; charClass: string }[] = [
  { key: 'normal', labelKey: 'settings.fontSizeNormal', charClass: 'text-[10px]' },
  { key: 'large', labelKey: 'settings.fontSizeLarge', charClass: 'text-[13px] font-bold' }
]

/**
 * 字号切换（Header 上的紧凑 2 态段控件）。
 * 与 Theme / Language 切换器风格对齐。
 */
export function FontSizeSwitcher() {
  const { t } = useTranslation()
  const current = settingsStore((s) => s.fontSize)

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.fontSizeLabel')}
      className="flex items-center gap-0.5 rounded-sm border border-border p-0.5"
    >
      {OPTIONS.map(({ key, labelKey, charClass }) => {
        const active = current === key
        const label = t(labelKey)
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => settingsStore.getState().setFontSize(key)}
            className={cn(
              'hud-mono flex h-6 w-6 items-center justify-center rounded-sm transition-colors',
              active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            <span className={charClass}>A</span>
          </button>
        )
      })}
    </div>
  )
}
