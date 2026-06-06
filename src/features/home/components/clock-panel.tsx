import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** UTC 时间 HH:MM:SS。 */
export function formatUtcTime(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
}

/** 本地时间 HH:MM:SS。 */
export function formatLocalTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

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
