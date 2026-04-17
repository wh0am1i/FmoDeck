import { useEffect } from 'react'
import { settingsStore } from '@/stores/settings'

/**
 * 把 settings.hudIntensity / hudScanlineOpacity / fontSize 应用到 :root。
 * - HUD 强度和扫描线经 CSS 变量驱动 .hud-frame / .hud-title / :focus-visible
 * - 字号通过 :root font-size 驱动所有 rem 单位（Tailwind text-* 全是 rem）
 */
const FONT_SIZE_PX = { normal: 16, large: 18 } as const

export function useHudStyles(): void {
  const intensity = settingsStore((s) => s.hudIntensity)
  const scanlineOpacity = settingsStore((s) => s.hudScanlineOpacity)
  const fontSize = settingsStore((s) => s.fontSize)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--hud-intensity', String(intensity))
    root.style.setProperty('--hud-scanline-opacity', String(scanlineOpacity))
    root.style.fontSize = `${FONT_SIZE_PX[fontSize]}px`
    root.classList.toggle('font-large', fontSize === 'large')
  }, [intensity, scanlineOpacity, fontSize])
}
