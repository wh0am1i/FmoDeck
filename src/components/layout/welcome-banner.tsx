import { useNavigate } from 'react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { settingsStore } from '@/stores/settings'
import { Rocket } from 'lucide-react'

/**
 * 首次使用引导：当没有配置任何 FMO 地址时显示。
 *
 * 放在 AppShell 顶部（Header 下方），提示用户去 Settings。一旦添加过任何
 * 地址（不管是否激活）就永久隐藏 —— Header 的 UNCONFIGURED 指示足够。
 */
export function WelcomeBanner() {
  const { t } = useTranslation()
  const addresses = settingsStore((s) => s.fmoAddresses)
  const navigate = useNavigate()

  if (addresses.length > 0) return null

  return (
    <div role="status" className="border-b border-primary bg-primary/10 px-4 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <Rocket className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
        <span className="hud-mono text-sm text-foreground">
          <span className="text-primary font-bold">{t('welcome.title')}</span>
          <span className="text-muted-foreground">
            <Trans
              i18nKey="welcome.hint"
              values={{ example: 'fmo.local' }}
              components={{ 1: <code className="text-primary" /> }}
            />
          </span>
        </span>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate('/settings')}
          aria-label={t('welcome.cta')}
        >
          {t('welcome.cta')}
        </Button>
      </div>
    </div>
  )
}
