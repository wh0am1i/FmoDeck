// src/features/sstv/sstv-view.tsx
import { audioStore } from '@/features/audio/store'
import { connectionStore } from '@/stores/connection'
import { SstvCanvas } from './components/sstv-canvas'
import { SstvHistory } from './components/sstv-history'

export function SstvView() {
  const enabled = audioStore((s) => s.enabled)
  const audioStatus = audioStore((s) => s.status)
  const connStatus = connectionStore((s) => s.status)

  const connected = connStatus === 'connected'
  const playing = audioStatus === 'playing'
  const audioReady = enabled && playing && connected

  return (
    <div className="flex flex-col gap-4">
      <section className="hud-frame flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-baseline gap-3">
          <h2 className="hud-title text-primary">SSTV</h2>
          <span className="hud-mono text-xs text-muted-foreground">
            Robot36 / Martin M1 / Martin M2
          </span>
        </div>

        {!audioReady ? (
          <p className="hud-mono text-xs text-accent">
            {!connected
              ? '未连接 FMO,请先在设置中连接。'
              : !enabled
                ? '音频未开启,请在底栏点击扬声器图标启动。'
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
