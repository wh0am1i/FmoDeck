import { useTranslation } from 'react-i18next'

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
