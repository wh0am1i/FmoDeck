import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { logsStore } from '../store'
import { FileUp, Trash2 } from 'lucide-react'

export function ImportAdifDialog() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localCount = logsStore((s) => s.local.length)

  async function handleFile(file: File) {
    setBusy(true)
    try {
      const buffer = await file.arrayBuffer()
      const { imported, skipped } = await logsStore.getState().importAdif(buffer)
      if (imported === 0) {
        toast.warning(`没有可导入的记录（跳过 ${skipped} 条，可能缺 CALL 或 QSO_DATE 字段）`)
      } else {
        const parts = [`已导入 ${imported} 条`]
        if (skipped > 0) parts.push(`跳过 ${skipped} 条`)
        toast.success(parts.join('，'))
        setOpen(false)
      }
    } catch (err) {
      toast.error(`导入失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    if (!window.confirm(`清空所有本地导入记录（${localCount} 条）？此操作不可恢复。`)) return
    setBusy(true)
    try {
      await logsStore.getState().clearLocal()
      toast.success('本地记录已清空')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileUp className="h-4 w-4" />
          导入 ADIF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">[ IMPORT ADIF ]</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            从 .adi 文件导入 QSO 记录到本地。持久化到浏览器 IndexedDB。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".adi,.adif,text/plain"
            className="hud-mono block w-full cursor-pointer rounded-sm border border-border bg-input/50 px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              e.target.value = ''
            }}
          />
          <p className="hud-mono text-xs text-muted-foreground">
            需要 <code className="text-primary">call</code>、
            <code className="text-primary">qso_date</code>、
            <code className="text-primary">time_on</code> 字段；其余字段会原样保留。
          </p>

          {localCount > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-sm border border-accent bg-accent/10 px-3 py-2">
              <span className="hud-mono text-xs text-accent">
                当前本地：<span className="font-bold">{localCount}</span> 条
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleClear()}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                清空本地
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
