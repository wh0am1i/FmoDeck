import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { settingsStore } from '@/stores/settings'

export function HudIntensityField() {
  const { t } = useTranslation()
  const intensity = settingsStore((s) => s.hudIntensity)
  const scanline = settingsStore((s) => s.hudScanlineOpacity)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="hud-intensity" className="hud-mono text-xs text-muted-foreground">
            {t('settings.hudIntensity')}
          </label>
          <span className="hud-mono text-xs text-primary">{intensity.toFixed(2)}</span>
        </div>
        <input
          id="hud-intensity"
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={intensity}
          onChange={(e) => settingsStore.getState().setHudIntensity(Number(e.target.value))}
          className="hud-range"
        />
        <span className="hud-mono text-xs text-muted-foreground/70">
          {t('settings.hudIntensityDesc')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="hud-scanline" className="hud-mono text-xs text-muted-foreground">
            {t('settings.hudScanline')}
          </label>
          <span className="hud-mono text-xs text-primary">{scanline.toFixed(3)}</span>
        </div>
        <input
          id="hud-scanline"
          type="range"
          min="0"
          max="0.2"
          step="0.005"
          value={scanline}
          onChange={(e) => settingsStore.getState().setHudScanlineOpacity(Number(e.target.value))}
          className="hud-range"
        />
        <span className="hud-mono text-xs text-muted-foreground/70">
          {t('settings.hudScanlineDesc')}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => {
          settingsStore.getState().setHudIntensity(1)
          settingsStore.getState().setHudScanlineOpacity(0.05)
        }}
      >
        {t('settings.hudReset')}
      </Button>
    </div>
  )
}
