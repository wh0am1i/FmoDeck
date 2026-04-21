// src/features/sstv/sstv-view.tsx
import { useEffect } from 'react'
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { sstvStore } from './store'
import { SstvCanvas } from './components/sstv-canvas'
import { SstvHistory } from './components/sstv-history'

export function SstvView() {
  const enabled = audioStore((s) => s.enabled)
  const audioStatus = audioStore((s) => s.status)
  const connStatus = connectionStore((s) => s.status)
  const backgroundSstv = settingsStore((s) => s.backgroundSstv)
  const setBackgroundSstv = settingsStore((s) => s.setBackgroundSstv)

  const connected = connStatus === 'connected'
  const playing = audioStatus === 'playing'
  const audioReady = enabled && playing && connected

  // 进 SSTV tab 就标记已读
  useEffect(() => {
    sstvStore.getState().markAllRead()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <section className="hud-frame flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="hud-title text-primary">SSTV</h2>
            <span className="hud-mono text-xs text-muted-foreground">
              Robot36 / Martin M1 / Martin M2
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 hud-mono text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={backgroundSstv}
              onChange={(e) => setBackgroundSstv(e.target.checked)}
              className="accent-primary"
            />
            后台监听（离开此 tab 也继续解码）
          </label>
        </div>

        {!audioReady ? (
          <p className="hud-mono text-xs text-accent">
            {!connected
              ? '未连接 FMO，请先在设置中连接。'
              : !enabled
                ? '音频未开启，请在底栏点击扬声器图标启动。'
                : '音频连接中…'}
          </p>
        ) : (
          <SstvCanvas />
        )}

        <SstvHistory />
      </section>
    </div>
  )
}
