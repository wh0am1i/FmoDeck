import { useEffect, useState } from 'react'

/** 仅"手机竖屏"才算 portrait：桌面窄高窗口不触发。 */
const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 767px)'

/** 是否手机竖屏。响应转屏实时更新。 */
export function usePortraitPhone(): boolean {
  const [portrait, setPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_QUERY)
    const onChange = (e: MediaQueryListEvent) => setPortrait(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return portrait
}
