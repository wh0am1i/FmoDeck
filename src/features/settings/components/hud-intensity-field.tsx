import { Button } from '@/components/ui/button'
import { settingsStore } from '@/stores/settings'

export function HudIntensityField() {
  const intensity = settingsStore((s) => s.hudIntensity)
  const scanline = settingsStore((s) => s.hudScanlineOpacity)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="hud-intensity" className="hud-mono text-xs text-muted-foreground">
            HUD 强度
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
          控制辉光 / 聚焦霓虹 · 0 = 纯净，2 = 强化
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="hud-scanline" className="hud-mono text-xs text-muted-foreground">
            扫描线不透明度
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
          全屏扫描线覆盖 · 0 = 关闭，0.2 = 明显
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
        重置为默认
      </Button>
    </div>
  )
}
