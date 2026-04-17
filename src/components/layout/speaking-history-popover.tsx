import { useNavigate } from 'react-router'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { cn } from '@/lib/utils'
import { History } from 'lucide-react'

function formatTimeAgo(unixSeconds: number, nowMs: number): string {
  const deltaSec = Math.floor(nowMs / 1000) - unixSeconds
  if (deltaSec < 60) return `${deltaSec}s 前`
  const m = Math.floor(deltaSec / 60)
  if (m < 60) return `${m}m 前`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h 前`
  return `${Math.floor(h / 24)}d 前`
}

interface Props {
  myCallsign: string
}

export function SpeakingHistoryPopover({ myCallsign }: Props) {
  const history = speakingStore((s) => s.history)
  const navigate = useNavigate()

  function gotoLogs(callsign: string) {
    logsStore.getState().setFilter(callsign)
    void navigate('/logs')
  }

  // 按 utcTime DESC 排序
  const sorted = [...history].sort((a, b) => b.utcTime - a.utcTime)
  const nowMs = Date.now()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hud-mono flex items-center gap-1 rounded-sm border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          aria-label="讲话历史"
          title="最近讲话历史"
        >
          <History className="h-3 w-3" />
          历史
          {history.length > 0 && (
            <span className="text-muted-foreground/70">({history.length})</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[90vw]">
        <div className="hud-mono flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="hud-title text-xs text-primary">[ 讲话历史 ]</span>
            <span className="text-xs text-muted-foreground">
              {history.length === 0 ? '暂无' : `最近 ${history.length} 位`}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              [ 连上中继后，服务器推送最近讲话历史 ]
            </div>
          ) : (
            <ul
              className="flex max-h-72 flex-col gap-0.5 overflow-y-auto"
              aria-label="讲话历史列表"
            >
              {sorted.map((item, idx) => {
                const isSelf =
                  myCallsign.trim().length > 0 &&
                  item.callsign.toUpperCase().startsWith(myCallsign.trim().toUpperCase())
                return (
                  <li key={`${item.callsign}-${item.utcTime}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => gotoLogs(item.callsign)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs hover:bg-primary/5'
                      )}
                      title="查看与该呼号的通联记录"
                    >
                      <span className="text-primary">{item.callsign}</span>
                      {isSelf && (
                        <span className="rounded-sm border border-primary bg-primary/10 px-1 text-[10px] leading-4 text-primary">
                          我
                        </span>
                      )}
                      <span className="flex-1" />
                      <span className="text-muted-foreground/70">
                        {formatTimeAgo(item.utcTime, nowMs)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
