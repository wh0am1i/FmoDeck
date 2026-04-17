import { useEffect } from 'react'
import { settingsStore } from '@/stores/settings'

/**
 * 把 settings.hudIntensity / hudScanlineOpacity / fontSize 应用到 :root。
 * - HUD 强度和扫描线经 CSS 变量驱动 .hud-frame / .hud-title / :focus-visible
 * - 字号切换通过 class 做（实际 font-size 由 globals.css 媒体查询控制，
 *   桌面 18px / 移动端 17px，避免移动端布局崩）
 */
export function useHudStyles(): void {
  const intensity = settingsStore((s) => s.hudIntensity)
  const scanlineOpacity = settingsStore((s) => s.hudScanlineOpacity)
  const fontSize = settingsStore((s) => s.fontSize)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--hud-intensity', String(intensity))
    root.style.setProperty('--hud-scanline-opacity', String(scanlineOpacity))
    root.classList.toggle('font-large', fontSize === 'large')
  }, [intensity, scanlineOpacity, fontSize])
}
