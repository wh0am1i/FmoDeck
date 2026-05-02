// src/features/sstv/sstv-view.tsx
import { useTranslation } from 'react-i18next'
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { SstvCanvas } from './components/sstv-canvas'
import { SstvHistory } from './components/sstv-history'

export function SstvView() {
  const { t } = useTranslation()
  const enabled = audioStore((s) => s.enabled)
  const audioStatus = audioStore((s) => s.status)
  const connStatus = connectionStore((s) => s.status)

  const connected = connStatus === 'connected'
  const playing = audioStatus === 'playing'
  const audioReady = enabled && playing && connected

  return (
    <div className="flex flex-col gap-4">
      <section className="hud-frame flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="hud-title text-primary">{t('sstv.title')}</h2>
            <div className="flex flex-wrap items-center gap-1">
              {t('sstv.modes')
                .split(/\s*\/\s*/)
                .map((mode) => (
                  <span
                    key={mode}
                    className="hud-mono rounded-sm border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary/70"
                  >
                    {mode}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {!connected && (
          <p className="hud-mono text-xs text-accent">{t('sstv.notConnected')}</p>
        )}
        {connected && !enabled && (
          <p className="hud-mono text-xs text-muted-foreground">{t('sstv.audioStartHint')}</p>
        )}
        {connected && enabled && !playing && (
          <p className="hud-mono text-xs text-muted-foreground">{t('sstv.audioConnecting')}</p>
        )}
        {audioReady && <SstvCanvas />}

        <SstvHistory />
      </section>
    </div>
  )
}
