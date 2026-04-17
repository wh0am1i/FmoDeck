import { useTranslation } from 'react-i18next'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { audioStore } from '../store'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'

const BAR_COUNT = 16

/**
 * SpeakingBar 右侧的音频收听控件。
 *
 * 两个外置按钮（无需打开 Popover 就能直接操作最常用两件事）：
 *   1. 收听开关：点一下开 / 再点一下关
 *   2. 音量百分比：展示 + 点开 Popover 调节音量 & 静音
 */
export function AudioControl() {
  const { t } = useTranslation()
  const enabled = audioStore((s) => s.enabled)
  const muted = audioStore((s) => s.muted)
  const status = audioStore((s) => s.status)
  const volume = audioStore((s) => s.volume)
  const lastError = audioStore((s) => s.lastError)
  const connStatus = connectionStore((s) => s.status)

  const connected = connStatus === 'connected'
  const busy = status === 'connecting'
  const active = enabled && status === 'playing' && !muted
  const pct = Math.round(volume * 100)

  const Icon = !enabled || muted ? VolumeX : busy ? Loader2 : Volume2
  const filled = Math.round((volume / 2) * BAR_COUNT)

  const toggleEnabled = () => {
    if (!connected) return
    // 首次点击 = user gesture，解锁 AudioContext；也能当"停止"按钮
    audioStore.getState().setEnabled(!enabled)
  }

  const triggerLabel = !connected
    ? t('audio.titleOffline')
    : enabled
      ? t('audio.titleStop')
      : t('audio.titleEnable')

  return (
    <div className="flex items-center gap-1">
      {/* 外置收听开关：单击即开 / 关 */}
      <button
        type="button"
        onClick={toggleEnabled}
        disabled={!connected}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-pressed={enabled}
        className={cn(
          'hud-mono flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs transition-colors',
          active
            ? 'border-primary bg-primary/10 text-primary'
            : enabled
              ? 'border-accent/60 bg-accent/5 text-accent'
              : 'border-border/60 text-muted-foreground hover:border-primary hover:text-primary',
          !connected && 'cursor-not-allowed opacity-50'
        )}
      >
        <Icon className={cn('h-3 w-3', busy && 'animate-spin')} />
        {enabled ? <MiniBar filled={filled} /> : <span>{t('audio.triggerLabel')}</span>}
      </button>

      {/* 外置音量芯片：点击展开 Popover */}
      {enabled && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t('audio.volumeAria')}
              title={t('audio.volumeAria')}
              className={cn(
                'hud-mono flex h-6 items-center rounded-sm border px-1.5 text-[10px] tabular-nums transition-colors',
                'border-border/60 text-muted-foreground hover:border-primary hover:text-primary'
              )}
            >
              {pct}%
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" sideOffset={6} className="w-72 bg-card p-4">
            <div className="hud-mono flex flex-col gap-3">
              {/* 标题 + 播放状态灯 */}
              <div className="flex items-baseline justify-between">
                <span className="hud-title text-xs text-primary">{t('audio.popoverTitle')}</span>
                <StatusDot muted={muted} playing={status === 'playing'} />
              </div>

              {/* 大号百分比 + VU 分段条 + slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{t('audio.volumeLabel')}</span>
                  <span className="text-lg text-primary tabular-nums">{pct}%</span>
                </div>
                <BigBar filled={filled} muted={muted} />
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={volume}
                  onChange={(e) => audioStore.getState().setVolume(Number(e.target.value))}
                  className="hud-range"
                  aria-label={t('audio.volumeAria')}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>0</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* 静音切换（保留） */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioStore.getState().setMuted(!muted)}
              >
                {muted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {muted ? t('audio.unmute') : t('audio.mute')}
              </Button>

              {lastError && (
                <span className="rounded-sm border border-destructive/60 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
                  {t('audio.errorPrefix')}
                  {lastError}
                </span>
              )}

              <span className="text-[10px] text-muted-foreground/70">{t('audio.volumeDesc')}</span>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

/** Trigger 里的 5 格迷你音量条。 */
function MiniBar({ filled }: { filled: number }) {
  const total = 5
  const mini = Math.round((filled / BAR_COUNT) * total)
  return (
    <span className="flex items-end gap-[1px]" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-[2px] transition-colors',
            i < mini ? 'bg-current' : 'bg-current/20',
            i === 0 && 'h-[3px]',
            i === 1 && 'h-[5px]',
            i === 2 && 'h-[7px]',
            i === 3 && 'h-[9px]',
            i === 4 && 'h-[11px]'
          )}
        />
      ))}
    </span>
  )
}

/** Popover 里的 16 格大音量条（类 VU meter）。 */
function BigBar({ filled, muted }: { filled: number; muted: boolean }) {
  return (
    <div className="flex h-4 items-stretch gap-[2px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const on = !muted && i < filled
        const color = on
          ? i < 8
            ? 'bg-primary'
            : i < 12
              ? 'bg-accent'
              : 'bg-destructive'
          : 'bg-border/40'
        return <span key={i} className={cn('flex-1 rounded-[1px]', color)} />
      })}
    </div>
  )
}

function StatusDot({ muted, playing }: { muted: boolean; playing: boolean }) {
  const cls = muted
    ? 'bg-muted-foreground'
    : playing
      ? 'animate-pulse bg-green-500'
      : 'bg-muted-foreground'
  return <span className={cn('h-2 w-2 rounded-full', cls)} aria-hidden="true" />
}
