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
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="hud-title text-primary">SSTV</h2>
            <span className="hud-mono text-xs text-muted-foreground">
              Robot 36 / Robot 72 / Martin M1 / Martin M2 / PD 120
            </span>
          </div>
        </div>

        {!connected && (
          <p className="hud-mono text-xs text-accent">未连接 FMO，请先在设置中连接。</p>
        )}
        {connected && !enabled && (
          <p className="hud-mono text-xs text-muted-foreground">
            点击底栏扬声器图标启动音频。
          </p>
        )}
        {connected && enabled && !playing && (
          <p className="hud-mono text-xs text-muted-foreground">音频连接中…</p>
        )}
        {audioReady && <SstvCanvas />}

        <SstvHistory />
      </section>
    </div>
  )
}
