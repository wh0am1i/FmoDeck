import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { QsoService } from '@/lib/qso-service/client'
import { connectionStore } from '@/stores/connection'
import { logsStore, selectFiltered, type DisplayRow } from './store'
import { ImportAdifDialog } from './components/import-adif-dialog'
import { LogDetailDialog } from './components/log-detail-dialog'
import { LogsFilter } from './components/logs-filter'
import { LogsPagination } from './components/logs-pagination'
import { LogsTable } from './components/logs-table'
import { downloadAdif } from './export'
import { Download, RefreshCw } from 'lucide-react'

export function LogsView() {
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

  const canLoadServer = connectionStatus === 'connected' && client !== null

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
          <h2 className="hud-title text-primary">[ LOGS ]</h2>
          <ImportAdifDialog />
        </div>
        <p className="hud-mono text-sm text-muted-foreground">
          [ OFFLINE · 请先在 Settings 配置 FMO 地址，或导入 ADIF 文件离线查看 ]
        </p>
      </section>
    )
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="hud-title text-primary">[ LOGS ]</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hud-mono text-xs text-muted-foreground">
            {syncMode === 'today' && '今天 · '}
            {filteredCount === totalCount
              ? `${totalCount} 条`
              : `${filteredCount} / ${totalCount} 条`}
            {localCount > 0 && <span className="text-accent"> · 含 {localCount} 本地</span>}
          </span>
          <ImportAdifDialog />
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
            disabled={status === 'loading' || !canLoadServer}
            title={!canLoadServer ? '需先连上 FMO 才能刷新' : '从服务器重新拉日志'}
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

      <LogsTable onRowClick={setDetailRow} />

      <div className="flex justify-end">
        <LogsPagination />
      </div>

      <LogDetailDialog row={detailRow} onClose={() => setDetailRow(null)} />
    </section>
  )
}
