import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatUtcTime, formatLocalTime } from '@/lib/utils/clock'

/** 双时钟浮层：UTC + 本地横排，秒级刷新。纯本地计算，无网络依赖。 */
export function ClockPanel() {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div
      data-testid="clock-panel"
      className="hud-frame hud-overlay flex h-full items-center justify-evenly gap-4 px-3 py-2 text-center"
    >
      <div>
        <div className="hud-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t('home.clockUtc')}
        </div>
        <div className="hud-mono text-lg leading-tight text-accent">{formatUtcTime(now)}</div>
      </div>
      <div>
        <div className="hud-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {t('home.clockLocal')}
        </div>
        <div className="hud-mono text-lg leading-tight">{formatLocalTime(now)}</div>
      </div>
    </div>
  )
}
