import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { GridLocation } from '@/components/shared/grid-location'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import type { DisplayRow } from '../store'
import { logsStore } from '../store'
import type { LocalQso, QsoDetail } from '@/types/qso'

function formatTs(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString()
}

function formatFreq(hz: number): string {
  return `${(hz / 1000000).toFixed(4)} MHz`
}

interface Props {
  row: DisplayRow | null
  onClose: () => void
}

export function LogDetailDialog({ row, onClose }: Props) {
  const { t } = useTranslation()
  const [serverDetail, setServerDetail] = useState<QsoDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const localRecord =
    row?.source === 'local' ? logsStore.getState().local.find((r) => r.id === row.localId) : null

  useEffect(() => {
    if (row?.source !== 'server') {
      setServerDetail(null)
      return
    }
    const client = connectionStore.getState().client
    if (!client) {
      toast.error(t('connection.unavailable'))
      onClose()
      return
    }
    setLoading(true)
    new QsoService(client)
      .getDetail(row.logId)
      .then((d) => {
        setServerDetail(d)
        setLoading(false)
      })
      .catch((err: unknown) => {
        toast.error(
          `${t('common.loadFailedPrefix')}${err instanceof Error ? err.message : String(err)}`
        )
        setLoading(false)
        onClose()
      })
  }, [row, onClose, t])

  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">
            {row?.source === 'local'
              ? t('logDetail.localTitle')
              : row
                ? t('logDetail.serverTitle', { id: row.logId })
                : t('logDetail.serverTitleNoId')}
          </DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {row?.source === 'local' ? t('logDetail.localSource') : t('logDetail.serverSource')}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="hud-mono py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
        )}

        {row?.source === 'server' && serverDetail && <ServerDetailView detail={serverDetail} />}

        {row?.source === 'local' && localRecord && <LocalDetailView record={localRecord} />}
      </DialogContent>
    </Dialog>
  )
}

function ServerDetailView({ detail }: { detail: QsoDetail }) {
  return (
    <dl className="hud-mono grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-2 text-sm">
      <dt className="text-muted-foreground">Time</dt>
      <dd>{formatTs(detail.timestamp)}</dd>

      <dt className="text-muted-foreground">Freq</dt>
      <dd>
        {formatFreq(detail.freqHz)} <span className="text-primary">({detail.mode})</span>
      </dd>

      <dt className="text-muted-foreground">From</dt>
      <dd>
        {detail.fromCallsign}
        {detail.fromGrid && (
          <>
            {' '}
            <span className="text-muted-foreground">(</span>
            <GridLocation grid={detail.fromGrid} />
            <span className="text-muted-foreground">)</span>
          </>
        )}
      </dd>

      <dt className="text-muted-foreground">To</dt>
      <dd className="text-primary">
        {detail.toCallsign}
        {detail.toGrid && (
          <>
            {' '}
            <span className="text-muted-foreground">(</span>
            <GridLocation grid={detail.toGrid} />
            <span className="text-muted-foreground">)</span>
          </>
        )}
      </dd>

      {detail.toComment && (
        <>
          <dt className="text-muted-foreground">Comment</dt>
          <dd className="break-all">{detail.toComment}</dd>
        </>
      )}

      <dt className="text-muted-foreground">Relay</dt>
      <dd>
        {detail.relayName} <span className="text-muted-foreground">/ {detail.relayAdmin}</span>
      </dd>
    </dl>
  )
}

function LocalDetailView({ record }: { record: LocalQso }) {
  const { t } = useTranslation()
  const entries = Object.entries(record.fields).filter(([, v]) => v !== undefined && v !== '')
  return (
    <div className="flex flex-col gap-2 py-2">
      <dl className="hud-mono grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Time</dt>
        <dd>{formatTs(record.timestamp)}</dd>
        <dt className="text-muted-foreground">Call</dt>
        <dd className="text-primary">{record.toCallsign}</dd>
        {record.grid && (
          <>
            <dt className="text-muted-foreground">Grid</dt>
            <dd>
              <GridLocation grid={record.grid} variant="block" />
            </dd>
          </>
        )}
      </dl>
      {entries.length > 3 && (
        <>
          <div className="hud-mono text-xs text-muted-foreground mt-2">
            {t('logDetail.adifFields')}
          </div>
          <dl className="hud-mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 max-h-64 overflow-y-auto text-xs">
            {entries.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground/80">{k}</dt>
                <dd className="break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}
