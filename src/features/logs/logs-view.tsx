import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import { HistoryTable } from '@/features/speaking/history-table'
import { logsStore, selectFiltered, type DisplayRow } from './store'
import { ImportAdifDialog } from './components/import-adif-dialog'
import { LogDetailDialog } from './components/log-detail-dialog'
import { LogsFilter, type LogsViewMode } from './components/logs-filter'
import { LogsPagination } from './components/logs-pagination'
import { LogsTable } from './components/logs-table'
import { downloadAdif } from './export'
import { Download, RefreshCw } from 'lucide-react'

export function LogsView() {
  const { t } = useTranslation()
  const status = logsStore((s) => s.status)
  const filteredCount = logsStore((s) => selectFiltered(s).length)
  const serverCount = logsStore((s) => s.all.length)
  const localCount = logsStore((s) => s.local.length)
  const totalCount = serverCount + localCount
  const syncMode = logsStore((s) => s.syncMode)
  const error = logsStore((s) => s.error)
  const connectionStatus = connectionStore((s) => s.status)
  const client = connectionStore((s) => s.client)

  const [detailRow, setDetailRow] = useState<DisplayRow | null>(null)
  const [didAutoLoad, setDidAutoLoad] = useState(false)
  const [mode, setMode] = useState<LogsViewMode>('logs')
  const isHistory = mode === 'history'

  const canLoadServer = connectionStatus === 'connected' && client !== null

  const refresh = async () => {
    if (!client) return
    try {
      await logsStore.getState().load(new QsoService(client))
      toast.success(t('logs.loaded', { count: logsStore.getState().all.length }))
    } catch {
      /* store 已记录 error */
    }
  }

  // 首次连接后自动拉一次
  useEffect(() => {
    if (canLoadServer && !didAutoLoad && status === 'idle' && serverCount === 0) {
      setDidAutoLoad(true)
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadServer, didAutoLoad, status, serverCount])

  const showingOffline = !canLoadServer && localCount === 0
  if (showingOffline) {
    return (
      <section className="hud-frame flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="hud-title text-primary">{t('logs.title')}</h2>
          <ImportAdifDialog />
        </div>
        <p className="hud-mono text-sm text-muted-foreground">
          {t('common.offlinePrefix')}
          {t('common.offlineHintLogs')} ]
        </p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="hud-title text-primary">{t('logs.title')}</h2>
          <span className="hud-mono text-xs text-muted-foreground">
            {syncMode === 'today' && t('logs.todayPrefix')}
            {filteredCount === totalCount
              ? t('logs.countRecords', { count: totalCount })
              : t('logs.countFiltered', { filtered: filteredCount, total: totalCount })}
            {localCount > 0 && (
              <span className="text-accent"> · {t('logs.withLocal', { count: localCount })}</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportAdifDialog />
          <Button
            variant="outline"
            size="sm"
            disabled={filteredCount === 0}
            title={t('logs.exportAdif')}
            onClick={() => {
              const rows = selectFiltered(logsStore.getState())
              downloadAdif(rows, `fmodeck-logs-${Date.now()}.adi`)
              toast.success(t('logs.exported', { count: rows.length }))
            }}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('logs.exportAdif')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={status === 'loading' || !canLoadServer}
            title={!canLoadServer ? t('logs.refreshDisabled') : t('logs.refreshHint')}
          >
            <RefreshCw className={status === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      </div>

      <LogsFilter mode={mode} onModeChange={setMode} />

      {status === 'error' && error && (
        <div className="hud-mono text-sm text-destructive">
          {t('common.loadFailedPrefix')}
          {error.message}
        </div>
      )}

      {isHistory ? (
        <HistoryTable />
      ) : (
        <>
          <LogsTable onRowClick={setDetailRow} />
          <div className="flex justify-end">
            <LogsPagination />
          </div>
        </>
      )}

      <LogDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
    </section>
  )
}
