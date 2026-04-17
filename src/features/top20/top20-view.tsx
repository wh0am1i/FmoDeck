import { useMemo } from 'react'
import { logsStore } from '@/features/logs/store'
import { connectionStore } from '@/stores/connection'
import type { QsoSummary } from '@/types/qso'

interface Top20Item {
  callsign: string
  count: number
  lastTime: number
}

function aggregateTop20(logs: QsoSummary[]): Top20Item[] {
  const map = new Map<string, { count: number; lastTime: number }>()
  for (const l of logs) {
    const prev = map.get(l.toCallsign)
    if (prev) {
      prev.count++
      if (l.timestamp > prev.lastTime) prev.lastTime = l.timestamp
    } else {
      map.set(l.toCallsign, { count: 1, lastTime: l.timestamp })
    }
  }
  return [...map.entries()]
    .map(([callsign, v]) => ({ callsign, ...v }))
    .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime)
    .slice(0, 20)
}

function formatTs(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function Top20View() {
  const all = logsStore((s) => s.all)
  const top20 = useMemo(() => aggregateTop20(all), [all])
  const total = all.length
  const connectionStatus = connectionStore((s) => s.status)

  if (connectionStatus !== 'connected') {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">[ TOP 20 ]</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          [ OFFLINE · 请先在 Settings 配置并激活 FMO 地址 ]
        </p>
      </section>
    )
  }

  if (total === 0) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">[ TOP 20 ]</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          [ 暂无数据 · 先到 LOGS 拉取日志 ]
        </p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="hud-title text-primary">[ TOP 20 ]</h2>
        <span className="hud-mono text-xs text-muted-foreground">
          基于 {total} 条日志聚合
        </span>
      </div>

      <ol className="flex flex-col gap-1">
        {top20.map((item, i) => (
          <li
            key={item.callsign}
            className="hud-mono flex items-center gap-3 rounded-sm border border-border/60 px-3 py-2"
          >
            <span className="w-6 text-right text-xs text-muted-foreground">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 text-sm text-primary">{item.callsign}</span>
            <span className="text-xs text-muted-foreground">最近 {formatTs(item.lastTime)}</span>
            <span className="min-w-8 text-right text-sm">
              <span className="text-primary">{item.count}</span>
              <span className="text-muted-foreground"> 次</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
