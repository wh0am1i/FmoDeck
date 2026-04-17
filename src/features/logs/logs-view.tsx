import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import { logsStore, selectFiltered } from './store'
import { LogDetailDialog } from './components/log-detail-dialog'
import { LogsFilter } from './components/logs-filter'
import { LogsPagination } from './components/logs-pagination'
import { LogsTable } from './components/logs-table'
import { downloadAdif } from './export'
import { Download, RefreshCw } from 'lucide-react'

export function LogsView() {
  const status = logsStore((s) => s.status)
  const filteredCount = logsStore((s) => selectFiltered(s).length)
  const totalCount = logsStore((s) => s.all.length)
  const syncMode = logsStore((s) => s.syncMode)
  const error = logsStore((s) => s.error)
  const connectionStatus = connectionStore((s) => s.status)
  const client = connectionStore((s) => s.client)

  const [detailLogId, setDetailLogId] = useState<number | null>(null)
  const [didAutoLoad, setDidAutoLoad] = useState(false)

  const canLoad = connectionStatus === 'connected' && client !== null

  const refresh = async () => {
    if (!client) return
    try {
      await logsStore.getState().load(new QsoService(client))
      toast.success(`已加载 ${logsStore.getState().all.length} 条日志`)
    } catch {
      /* store 已记录 error */
    }
  }

  // 首次连接后自动拉一次
  useEffect(() => {
    if (canLoad && !didAutoLoad && status === 'idle' && totalCount === 0) {
      setDidAutoLoad(true)
      void refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, didAutoLoad, status, totalCount])

  if (!canLoad) {
    return (
      <section className="hud-frame p-6">
        <h2 className="hud-title text-primary mb-2">[ LOGS ]</h2>
        <p className="hud-mono text-sm text-muted-foreground">
          [ OFFLINE · 请先在 Settings 配置并激活 FMO 地址 ]
        </p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="hud-title text-primary">[ LOGS ]</h2>
        <div className="flex items-center gap-2">
          <span className="hud-mono text-xs text-muted-foreground">
            {syncMode === 'today' && '今天 · '}
            {filteredCount === totalCount
              ? `${totalCount} 条`
              : `${filteredCount} / ${totalCount} 条`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={totalCount === 0}
            onClick={() => {
              const all = logsStore.getState().all
              downloadAdif(all, `fmodeck-logs-${Date.now()}.adi`)
              toast.success(`已导出 ${all.length} 条日志`)
            }}
          >
            <Download className="h-4 w-4" />
            导出 ADIF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={status === 'loading'}
          >
            <RefreshCw className={status === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            刷新
          </Button>
        </div>
      </div>

      <LogsFilter />

      {status === 'error' && error && (
        <div className="hud-mono text-sm text-destructive">加载失败: {error.message}</div>
      )}

      <LogsTable onRowClick={setDetailLogId} />

      <div className="flex justify-end">
        <LogsPagination />
      </div>

      <LogDetailDialog logId={detailLogId} onClose={() => setDetailLogId(null)} />
    </section>
  )
}
