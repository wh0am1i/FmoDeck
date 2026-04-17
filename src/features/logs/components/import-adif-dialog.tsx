import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Trans, useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        toast.warning(t('adifImport.emptyFile', { skipped }))
      } else {
        const parts = [t('adifImport.importedOk', { imported })]
        if (skipped > 0) parts.push(t('adifImport.importedSkipped', { skipped }))
        toast.success(parts.join('，'))
        setOpen(false)
      }
    } catch (err) {
      toast.error(
        `${t('adifImport.failedPrefix')}${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    if (!window.confirm(t('adifImport.confirmClear', { count: localCount }))) return
    setBusy(true)
    try {
      await logsStore.getState().clearLocal()
      toast.success(t('adifImport.cleared'))
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
          {t('adifImport.button')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">{t('adifImport.title')}</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            {t('adifImport.description')}
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
            <Trans
              i18nKey="adifImport.fieldHelp"
              components={{
                1: <code className="text-primary" />,
                2: <code className="text-primary" />,
                3: <code className="text-primary" />
              }}
            />
          </p>

          {localCount > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-sm border border-accent bg-accent/10 px-3 py-2">
              <span className="hud-mono text-xs text-accent">
                {t('adifImport.localCountLabel')}
                <span className="font-bold">{localCount}</span>
                {t('adifImport.localCountSuffix')}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleClear()}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                {t('adifImport.clearLocal')}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
