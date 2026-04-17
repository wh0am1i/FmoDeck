import { messagesStore } from '../store'
import { cn } from '@/lib/utils'

function formatTs(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  onRowClick: (messageId: string) => void
}

export function MessagesList({ onRowClick }: Props) {
  const list = messagesStore((s) => s.list)

  if (list.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">
        [ NO MESSAGES · 收件箱为空 ]
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label="消息列表">
      {list.map((m) => (
        <li key={m.messageId}>
          <button
            type="button"
            onClick={() => onRowClick(m.messageId)}
            className={cn(
              'hud-mono flex w-full items-center gap-3 rounded-sm border border-border px-3 py-2 text-left text-sm',
              'hover:bg-primary/5',
              !m.isRead && 'border-l-2 border-l-primary'
            )}
          >
            <span className="flex h-2 w-2 flex-none items-center justify-center">
              {!m.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className={cn('flex-1 text-primary', m.isRead && 'text-muted-foreground')}>
              {m.from}
            </span>
            <span className="text-xs text-muted-foreground">{formatTs(m.timestamp)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
