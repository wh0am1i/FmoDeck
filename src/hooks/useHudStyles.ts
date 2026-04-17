import { useEffect } from 'react'
import { settingsStore } from '@/stores/settings'

/**
 * 把 settings.hudIntensity / hudScanlineOpacity 应用到 :root 的 CSS 变量。
 * globals.css 里的 .hud-glow / :focus-visible / 扫描线覆盖层都引用这些变量。
 */
export function useHudStyles(): void {
  const intensity = settingsStore((s) => s.hudIntensity)
  const scanlineOpacity = settingsStore((s) => s.hudScanlineOpacity)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--hud-intensity', String(intensity))
    root.style.setProperty('--hud-scanline-opacity', String(scanlineOpacity))
  }, [intensity, scanlineOpacity])
}
