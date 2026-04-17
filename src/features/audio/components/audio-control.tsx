import { useTranslation } from 'react-i18next'
import { Loader2, Power, Volume2, VolumeX } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { audioStore } from '../store'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'

const BAR_COUNT = 16

/**
 * SpeakingBar 右侧的音频收听控件。
 *
 * Trigger：一个小按钮
 *   - 未开启：🔇 收听（灰色）
 *   - 已开启：🔊 + 16 格 HUD 音量条 + 百分比（主色高亮）
 * 点击 trigger：
 *   - 未开启 → 开启（首次点作为 user gesture 解锁 AudioContext）
 *   - 已开启 → 打开 Popover 调节
 *
 * Popover 里：静音切换、音量 slider（带 VU 色阶可视化）、停止按钮。
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

  // 已开启时点击 trigger → Popover 自然打开；未开启时 → 直接启用
  // 未开启时不希望 Popover 出现，用受控 open。
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!connected) return
    if (!enabled) {
      // 首次点击 = user gesture，解锁 AudioContext 并启用
      audioStore.getState().setEnabled(true)
      e.preventDefault() // 阻止 Popover 本次打开；下一次点击再打开
    }
  }

  const triggerLabel = !connected
    ? t('audio.titleOffline')
    : !enabled
      ? t('audio.titleEnable')
      : t('audio.popoverTitle')

  // 音量 bar 分格显示：每格代表 12.5%（16 格 × 12.5% = 200% 上限）
  const filled = Math.round((volume / 2) * BAR_COUNT)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={!connected}
          aria-label={triggerLabel}
          title={triggerLabel}
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
          {enabled ? (
            <>
              <MiniBar filled={filled} />
              <span className="tabular-nums">{pct}%</span>
            </>
          ) : (
            <span>{t('audio.triggerLabel')}</span>
          )}
        </button>
      </PopoverTrigger>

      {enabled && (
        <PopoverContent align="end" sideOffset={6} className="w-72 bg-card p-4">
          <div className="hud-mono flex flex-col gap-3">
            {/* 头部：标题 + 状态灯 */}
            <div className="flex items-baseline justify-between">
              <span className="hud-title text-xs text-primary">{t('audio.popoverTitle')}</span>
              <StatusDot muted={muted} playing={status === 'playing'} />
            </div>

            {/* 音量显示：大号百分比 + 分段条 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">{t('audio.volumeLabel')}</span>
                <span className="text-lg text-primary tabular-nums">{pct}%</span>
              </div>
              <BigBar filled={filled} />
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

            {/* 操作行 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => audioStore.getState().setMuted(!muted)}
              >
                {muted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {muted ? t('audio.unmute') : t('audio.mute')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => audioStore.getState().setEnabled(false)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Power className="h-3.5 w-3.5" />
                {t('audio.stop')}
              </Button>
            </div>

            {lastError && (
              <span className="rounded-sm border border-destructive/60 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
                {t('audio.errorPrefix')}
                {lastError}
              </span>
            )}

            <span className="text-[10px] text-muted-foreground/70">{t('audio.volumeDesc')}</span>
          </div>
        </PopoverContent>
      )}
    </Popover>
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
            // 渐增高度
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
function BigBar({ filled }: { filled: number }) {
  return (
    <div className="flex items-stretch gap-[2px] h-4" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const on = i < filled
        // 8 格以上转琥珀，12 格以上转品红（VU meter 风）
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

/** 状态小圆点：静音灰、播放绿脉冲、其他灰。 */
function StatusDot({ muted, playing }: { muted: boolean; playing: boolean }) {
  const cls = muted
    ? 'bg-muted-foreground'
    : playing
      ? 'bg-green-500 animate-pulse'
      : 'bg-muted-foreground'
  return <span className={cn('h-2 w-2 rounded-full', cls)} aria-hidden="true" />
}
