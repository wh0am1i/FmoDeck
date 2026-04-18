import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SpectrumVisualizer } from '@/features/audio/components/spectrum-visualizer'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'
import { SpectrumWaterfall } from '@/features/audio/components/spectrum-waterfall'
import { SpectrumStats } from '@/features/audio/components/spectrum-stats'
import { RecentCallsigns } from './components/recent-callsigns'
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'

export function SpectrumView() {
  const { t } = useTranslation()
  const enabled = audioStore((s) => s.enabled)
  const muted = audioStore((s) => s.muted)
  const status = audioStore((s) => s.status)
  const connStatus = connectionStore((s) => s.status)
  const connected = connStatus === 'connected'
  const playing = status === 'playing'

  const toggle = () => {
    if (!connected) return
    audioStore.getState().setEnabled(!enabled)
  }

  const dimmed = !enabled

  return (
    <div className="flex flex-col gap-4">
      <section className="hud-frame flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="hud-title text-primary">{t('spectrum.title')}</h2>
            <StatusLight enabled={enabled} playing={playing} muted={muted} />
            <span className="hud-mono text-xs text-muted-foreground">
              {enabled
                ? playing
                  ? muted
                    ? t('spectrum.muted')
                    : t('spectrum.live')
                  : t('spectrum.buffering')
                : t('spectrum.idle')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={enabled ? 'default' : 'outline'}
              size="sm"
              disabled={!connected}
              onClick={toggle}
            >
              {enabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {enabled ? t('spectrum.stop') : t('spectrum.start')}
            </Button>
          </div>
        </div>

        {/* 讲话者名册：当前 + 历史 callsign 芯片 */}
        <Panel title={t('spectrum.panelRoster')}>
          <RecentCallsigns />
        </Panel>

        {/* 大号柱状频谱（镜像 + 峰值保持 + HUD 栅格） */}
        <Panel title={t('spectrum.panelBars')} dim={dimmed}>
          <SpectrumVisualizer
            height={240}
            bars={72}
            gap={3}
            smoothing={0.22}
            mirror
            peakHold
            grid
          />
        </Panel>

        {/* 次级面板：时域示波器 + 数据条（侧栏） */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
          <Panel title={t('spectrum.panelWave')} dim={dimmed}>
            <SpectrumWaveform height={140} />
          </Panel>
          <Panel title={t('spectrum.panelStats')} dim={dimmed}>
            <div className="flex h-[140px] flex-col justify-center p-3">
              <SpectrumStats />
            </div>
          </Panel>
        </div>

        {/* 瀑布图（spectrogram） */}
        <Panel title={t('spectrum.panelWaterfall')} dim={dimmed}>
          <SpectrumWaterfall height={200} />
        </Panel>

        <p className="hud-mono text-xs text-muted-foreground">{t('spectrum.desc')}</p>

        {!connected && <p className="hud-mono text-xs text-accent">{t('spectrum.hintOffline')}</p>}
        {connected && !enabled && (
          <p className="hud-mono text-xs text-muted-foreground">{t('spectrum.hintStart')}</p>
        )}
      </section>
    </div>
  )
}

function Panel({
  title,
  children,
  dim
}: {
  title: string
  children: React.ReactNode
  dim?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-sm border border-primary/20 bg-background/40',
        dim && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between border-b border-primary/10 bg-card/40 px-3 py-1.5">
        <span className="hud-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

function StatusLight({
  enabled,
  playing,
  muted
}: {
  enabled: boolean
  playing: boolean
  muted: boolean
}) {
  const color = !enabled
    ? 'bg-muted-foreground'
    : muted
      ? 'bg-accent'
      : playing
        ? 'animate-pulse bg-green-500'
        : 'bg-muted-foreground'
  return <span className={cn('h-2 w-2 rounded-full', color)} aria-hidden="true" />
}
