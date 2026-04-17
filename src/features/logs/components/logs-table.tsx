import { useShallow } from 'zustand/react/shallow'
import { logsStore, selectPageSlice } from '../store'

function formatTs(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

interface Props {
  onRowClick: (logId: number) => void
}

export function LogsTable({ onRowClick }: Props) {
  const slice = logsStore(useShallow(selectPageSlice))

  if (slice.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">
        [ NO RECORDS · 等连接或清过滤条件 ]
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="hud-mono w-full text-sm" aria-label="QSO 日志列表">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">TIME</th>
            <th className="px-3 py-2">TO CALL</th>
            <th className="px-3 py-2 hidden sm:table-cell">GRID</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r) => (
            <tr
              key={r.logId}
              onClick={() => onRowClick(r.logId)}
              className="cursor-pointer border-b border-border/40 hover:bg-primary/5"
            >
              <td className="px-3 py-2 text-muted-foreground">{formatTs(r.timestamp)}</td>
              <td className="px-3 py-2 text-primary">{r.toCallsign}</td>
              <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{r.grid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
