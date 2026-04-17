import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { setAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '@/i18n'

const SHORT_LABEL: Record<AppLanguage, string> = {
  'zh-CN': '中',
  en: 'EN'
}

const LONG_LABEL_KEY: Record<AppLanguage, string> = {
  'zh-CN': 'language.zhCN',
  en: 'language.en'
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current: AppLanguage = i18n.language.startsWith('en') ? 'en' : 'zh-CN'

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className="flex items-center gap-0.5 rounded-sm border border-border p-0.5"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = current === lang
        const label = t(LONG_LABEL_KEY[lang])
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setAppLanguage(lang)}
            className={cn(
              'hud-mono flex h-6 min-w-6 items-center justify-center rounded-sm px-1 text-[10px] font-medium transition-colors',
              active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            {SHORT_LABEL[lang]}
          </button>
        )
      })}
    </div>
  )
}
