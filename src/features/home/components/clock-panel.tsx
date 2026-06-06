import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatUtcTime, formatLocalTime } from '@/lib/utils/clock'

/** 右上角双时钟浮层：UTC + 本地，秒级刷新。纯本地计算，无网络依赖。 */
export function ClockPanel() {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div data-testid="clock-panel" className="hud-frame hud-overlay px-3 py-2 text-center">
      <div className="hud-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {t('home.clockUtc')}
      </div>
      <div className="hud-mono text-lg leading-tight text-accent">{formatUtcTime(now)}</div>
      <div className="hud-mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {t('home.clockLocal')}
      </div>
      <div className="hud-mono text-base leading-tight">{formatLocalTime(now)}</div>
    </div>
  )
}
