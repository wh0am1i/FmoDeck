import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { updaterStore } from '@/features/updater/store'
import { APP_VERSION } from '@/lib/utils/app-version'
import { isAndroid } from '@/lib/utils/platform'
import { settingsStore } from '@/stores/settings'

function formatDate(ts: number | null, never: string): string {
  if (!ts) return never
  const d = new Date(ts)
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
}

export function UpdateSection(): React.JSX.Element | null {
  const { t } = useTranslation()
  const autoCheck = settingsStore((s) => s.autoUpdateCheck)
  const lastChecked = settingsStore((s) => s.lastUpdateCheckAt)
  const setAuto = settingsStore((s) => s.setAutoUpdateCheck)
  const setLast = settingsStore((s) => s.setLastUpdateCheckAt)
  const state = updaterStore((s) => s.state)
  const manifest = updaterStore((s) => s.manifest)

  if (!isAndroid()) return null

  const baseUrl = import.meta.env.VITE_UPDATE_BASE_URL as string | undefined
  const canCheck = Boolean(baseUrl) && state !== 'checking'

  const onManualCheck = async (): Promise<void> => {
    if (!baseUrl) return
    await updaterStore.getState().check(baseUrl, APP_VERSION)
    setLast(Date.now())
  }

  return (
    <section className="hud-frame p-6 flex flex-col gap-3">
      <h2 className="hud-title text-primary">{t('updater.sectionTitle')}</h2>
      <div className="hud-mono text-xs text-muted-foreground flex flex-col gap-1">
        <div>
          {t('updater.currentVersion')}: v{APP_VERSION}
        </div>
        {manifest && (
          <div>
            {t('updater.latestVersion')}: v{manifest.version}
          </div>
        )}
        <div>
          {t('updater.lastCheckedLabel')}:{' '}
          {formatDate(lastChecked, t('updater.lastCheckedNever'))}
        </div>
      </div>
      <label className="hud-mono text-xs inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoCheck}
          onChange={(e) => setAuto(e.target.checked)}
        />
        {t('updater.autoCheckLabel')}
      </label>
      <div>
        <Button onClick={() => { void onManualCheck() }} disabled={!canCheck}>
          {state === 'checking' ? t('updater.checking') : t('updater.manualCheckBtn')}
        </Button>
      </div>
    </section>
  )
}
