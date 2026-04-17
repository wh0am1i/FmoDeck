import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { isValidChineseCallsign } from '@/lib/utils/callsign'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'

export function CallsignField() {
  const { t } = useTranslation()
  const call = settingsStore((s) => s.currentCallsign)
  const empty = call.length === 0
  const valid = empty || isValidChineseCallsign(call)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="callsign" className="hud-mono text-xs text-muted-foreground">
        {t('settings.callsignLabel')}
      </label>
      <Input
        id="callsign"
        value={call}
        onChange={(e) => settingsStore.getState().setCurrentCallsign(e.target.value)}
        placeholder="BA0AX / BA0AX-5"
        className={cn(!valid && 'border-destructive')}
        aria-invalid={!valid}
      />
      {!valid ? (
        <span className="hud-mono text-xs text-destructive">{t('settings.callsignInvalid')}</span>
      ) : (
        <span className="hud-mono text-xs text-muted-foreground/70">
          {t('settings.callsignDesc')}
        </span>
      )}
    </div>
  )
}
