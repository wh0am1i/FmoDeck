import { settingsStore } from '@/stores/settings'

/**
 * HUD 扫描线覆盖层（fixed 覆盖全屏，不拦截交互）。
 * 不透明度由 `--hud-scanline-opacity` 驱动；=0 时视觉完全消失。
 */
export function ScanlineOverlay() {
  const opacity = settingsStore((s) => s.hudScanlineOpacity)

  if (opacity <= 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, hsl(var(--primary) / 0.8) 0px, hsl(var(--primary) / 0.8) 1px, transparent 1px, transparent 3px)',
        opacity
      }}
    />
  )
}
