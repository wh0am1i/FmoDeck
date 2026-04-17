import { useTranslation } from 'react-i18next'
import { Type } from 'lucide-react'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'

const OPTIONS: { key: 'normal' | 'large'; labelKey: string; previewPx: number }[] = [
  { key: 'normal', labelKey: 'settings.fontSizeNormal', previewPx: 12 },
  { key: 'large', labelKey: 'settings.fontSizeLarge', previewPx: 15 }
]

/**
 * 字号切换（正常 / 大）。驱动 :root font-size，所有 rem 的 Tailwind
 * text-* 都会按比例放大，移动端布局大多已用 flex-wrap / responsive
 * padding，可以自适应。
 */
export function FontSizeField() {
  const { t } = useTranslation()
  const fontSize = settingsStore((s) => s.fontSize)

  return (
    <div className="flex flex-col gap-2">
      <label className="hud-mono text-xs text-muted-foreground">
        {t('settings.fontSizeLabel')}
      </label>
      <div
        role="radiogroup"
        aria-label={t('settings.fontSizeLabel')}
        className="hud-mono flex items-stretch gap-0.5 rounded-sm border border-border p-0.5"
      >
        {OPTIONS.map(({ key, labelKey, previewPx }) => {
          const active = fontSize === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => settingsStore.getState().setFontSize(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2 transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
              style={{ fontSize: `${previewPx}px` }}
            >
              <Type className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          )
        })}
      </div>
      <span className="hud-mono text-xs text-muted-foreground/70">
        {t('settings.fontSizeDesc')}
      </span>
    </div>
  )
}
