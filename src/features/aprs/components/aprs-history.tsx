import { Button } from '@/components/ui/button'
import { aprsStore, type AprsHistoryRecord } from '../store'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const COLOR: Record<AprsHistoryRecord['operationType'], string> = {
  send: 'text-muted-foreground',
  success: 'text-green-500',
  fail: 'text-destructive'
}

const PREFIX: Record<AprsHistoryRecord['operationType'], string> = {
  send: '→',
  success: '✓',
  fail: '✗'
}

export function AprsHistory() {
  const history = aprsStore((s) => s.history)

  if (history.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">[ NO HISTORY ]</div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="hud-mono text-xs text-muted-foreground">
          最近 {history.length} 条
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => aprsStore.getState().clearHistory()}
        >
          <Trash2 className="h-4 w-4" />
          清空历史
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {history.map((r, i) => (
          <li
            key={`${r.timestamp}-${i}`}
            className="hud-mono flex flex-col gap-0.5 rounded-sm border border-border/60 p-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className={cn('font-bold', COLOR[r.operationType])}>
                {PREFIX[r.operationType]}
              </span>
              <span className="flex-1">{r.message}</span>
              <span className="text-muted-foreground/70">{formatTs(r.timestamp)}</span>
            </div>
            {r.raw && (
              <code className="break-all text-muted-foreground/70">{r.raw}</code>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
