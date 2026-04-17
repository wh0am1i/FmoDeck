import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectionStore } from '@/stores/connection'

/**
 * 连接错误时在 AppShell 顶部显示的横幅。
 *
 * - 仅在 `connection.status === 'error'` 时渲染
 * - 显示 `lastError.message` + "重试"按钮（触发 `connect(currentUrl)`）
 * - 无 `currentUrl`（例如从未连过）时不显示重试按钮
 */
export function ConnectionErrorBanner() {
  const status = connectionStore((s) => s.status)
  const lastError = connectionStore((s) => s.lastError)
  const currentUrl = connectionStore((s) => s.currentUrl)

  if (status !== 'error') return null

  return (
    <div role="alert" className="border-b border-destructive bg-destructive/10 px-4 py-2">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
        <span className="hud-mono flex-1 text-sm text-destructive">
          连接失败：{lastError?.message ?? '未知错误'}
        </span>
        {currentUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void connectionStore.getState().connect(currentUrl)}
            aria-label="重试连接"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </Button>
        )}
      </div>
    </div>
  )
}
