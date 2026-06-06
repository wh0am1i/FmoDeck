import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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

/** 竖屏全屏遮罩：提示旋转到横屏。 */
export function PortraitHint() {
  const { t } = useTranslation()
  return (
    <div
      data-testid="portrait-hint"
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/95"
    >
      <span className="hud-title px-6 text-center text-lg text-primary">
        {t('home.portraitHint')}
      </span>
    </div>
  )
}
