import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import type { QsoDetail } from '@/types/qso'

function formatTs(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString()
}

function formatFreq(hz: number): string {
  return `${(hz / 1000000).toFixed(4)} MHz`
}

interface Props {
  logId: number | null
  onClose: () => void
}

export function LogDetailDialog({ logId, onClose }: Props) {
  const [detail, setDetail] = useState<QsoDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (logId === null) {
      setDetail(null)
      return
    }
    const client = connectionStore.getState().client
    if (!client) {
      toast.error('连接不可用')
      onClose()
      return
    }
    setLoading(true)
    new QsoService(client)
      .getDetail(logId)
      .then((d) => {
        setDetail(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        toast.error(`加载详情失败: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
        onClose()
      })
  }, [logId, onClose])

  return (
    <Dialog open={logId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">
            [ LOG DETAIL{logId !== null ? ` #${logId}` : ''} ]
          </DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            服务器返回的完整 QSO 记录
          </DialogDescription>
        </DialogHeader>
        {loading && <div className="hud-mono py-6 text-sm text-muted-foreground">加载中...</div>}
        {detail && (
          <dl className="hud-mono grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-2 text-sm">
            <dt className="text-muted-foreground">Time</dt>
            <dd>{formatTs(detail.timestamp)}</dd>

            <dt className="text-muted-foreground">Freq</dt>
            <dd>
              {formatFreq(detail.freqHz)} <span className="text-primary">({detail.mode})</span>
            </dd>

            <dt className="text-muted-foreground">From</dt>
            <dd>
              {detail.fromCallsign}{' '}
              <span className="text-muted-foreground">({detail.fromGrid})</span>
            </dd>

            <dt className="text-muted-foreground">To</dt>
            <dd className="text-primary">
              {detail.toCallsign} <span className="text-muted-foreground">({detail.toGrid})</span>
            </dd>

            {detail.toComment && (
              <>
                <dt className="text-muted-foreground">Comment</dt>
                <dd className="break-all">{detail.toComment}</dd>
              </>
            )}

            <dt className="text-muted-foreground">Relay</dt>
            <dd>
              {detail.relayName}{' '}
              <span className="text-muted-foreground">/ {detail.relayAdmin}</span>
            </dd>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
