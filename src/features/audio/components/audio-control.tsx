import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { audioStore } from '../store'
import { connectionStore } from '@/stores/connection'
import { cn } from '@/lib/utils'

/**
 * SpeakingBar 上的音频开关 + 音量弹窗。
 *
 * 首次点击 = 用户手势，满足浏览器 AudioContext 解锁要求。
 */
export function AudioControl() {
  const { t } = useTranslation()
  const enabled = audioStore((s) => s.enabled)
  const muted = audioStore((s) => s.muted)
  const status = audioStore((s) => s.status)
  const volume = audioStore((s) => s.volume)
  const lastError = audioStore((s) => s.lastError)
  const connStatus = connectionStore((s) => s.status)
  const [expanded, setExpanded] = useState(false)

  const connected = connStatus === 'connected'
  const busy = status === 'connecting'
  const active = enabled && status === 'playing' && !muted

  function toggleEnabled() {
    if (!connected) return
    audioStore.getState().setEnabled(!enabled)
    if (!enabled) {
      // 首次启用：顺便展开音量 UI 让用户感知到开了
      setExpanded(true)
    }
  }

  function toggleMuted() {
    audioStore.getState().setMuted(!muted)
  }

  const Icon = !enabled || muted || !connected ? VolumeX : busy ? Loader2 : Volume2
  const iconClass = busy ? 'animate-spin' : ''

  const titleKey = !connected
    ? 'audio.titleOffline'
    : !enabled
      ? 'audio.titleEnable'
      : muted
        ? 'audio.titleUnmute'
        : 'audio.titleMute'

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={enabled ? toggleMuted : toggleEnabled}
        disabled={!connected}
        aria-label={t(titleKey)}
        title={t(titleKey)}
        className={cn(
          'hud-mono flex h-6 items-center gap-1 rounded-sm border px-2 text-xs transition-colors',
          active
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border/60 text-muted-foreground hover:border-primary hover:text-primary',
          !connected && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon className={cn('h-3 w-3', iconClass)} />
        <span>{t(active ? 'audio.on' : 'audio.off')}</span>
      </button>

      {enabled && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={t('audio.volumeAria')}
          title={t('audio.volumeAria')}
          className="hud-mono flex h-6 items-center rounded-sm border border-border/60 px-1.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          {Math.round(volume * 100)}%
        </button>
      )}

      {expanded && enabled && (
        <div
          role="dialog"
          aria-label={t('audio.volumeAria')}
          className="hud-frame absolute right-0 top-full z-50 mt-1 flex w-56 flex-col gap-2 bg-card p-3"
        >
          <div className="hud-mono flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('audio.volumeLabel')}</span>
            <span className="text-primary">{Math.round(volume * 100)}%</span>
          </div>
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
          <span className="hud-mono text-[10px] text-muted-foreground/70">
            {t('audio.volumeDesc')}
          </span>
          {lastError && (
            <span className="hud-mono text-[10px] text-destructive">
              {t('audio.errorPrefix')}
              {lastError}
            </span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="hud-mono self-end text-[10px] text-muted-foreground hover:text-primary"
          >
            {t('common.close')}
          </button>
        </div>
      )}
    </div>
  )
}
