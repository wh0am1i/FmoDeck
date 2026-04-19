import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { startDownload, startInstall } from './actions'
import { updaterStore } from './store'

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export function UpdateDialog(): React.JSX.Element | null {
  const { t } = useTranslation()
  const state = updaterStore((s) => s.state)
  const manifest = updaterStore((s) => s.manifest)
  const progress = updaterStore((s) => s.progress)
  const error = updaterStore((s) => s.error)
  const dismiss = updaterStore((s) => s.dismiss)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const open =
    state === 'available' ||
    state === 'downloading' ||
    state === 'ready' ||
    state === 'error'
  if (!open) return null

  const title =
    state === 'available'
      ? t('updater.dialogTitleAvailable', { version: manifest?.version })
      : state === 'downloading'
        ? t('updater.dialogTitleDownloading')
        : state === 'ready'
          ? t('updater.dialogTitleReady')
          : t('updater.dialogTitleError')

  const onDownload = (): void => {
    abortRef.current = new AbortController()
    void startDownload(abortRef.current.signal)
  }
  const onCancel = (): void => {
    abortRef.current?.abort()
  }
  const onInstall = (): void => {
    void startInstall()
  }
  const onRetry = (): void => {
    updaterStore.getState().dismiss()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">{title}</DialogTitle>
        </DialogHeader>

        {state === 'available' && manifest && (
          <pre className="hud-mono text-xs whitespace-pre-wrap max-h-64 overflow-auto">
            {manifest.notes}
          </pre>
        )}

        {state === 'downloading' && (
          <div className="hud-mono text-xs">
            <div className="w-full h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="mt-1 text-muted-foreground">
              {Math.round(progress * 100)}%
            </div>
          </div>
        )}

        {state === 'ready' && (
          <div className="hud-mono text-xs text-muted-foreground">
            {t('updater.btnInstall')} ↓
          </div>
        )}

        {state === 'error' && (
          <div className="hud-mono text-xs text-destructive">{error}</div>
        )}

        <DialogFooter>
          {state === 'available' && manifest && (
            <>
              <Button variant="outline" onClick={dismiss}>
                {t('updater.btnLater')}
              </Button>
              <Button onClick={onDownload}>
                {t('updater.btnDownload', { size: formatSize(manifest.size) })}
              </Button>
            </>
          )}
          {state === 'downloading' && (
            <Button variant="outline" onClick={onCancel}>
              {t('updater.btnCancel')}
            </Button>
          )}
          {state === 'ready' && (
            <>
              <Button variant="outline" onClick={dismiss}>
                {t('updater.btnLater')}
              </Button>
              <Button onClick={onInstall}>{t('updater.btnInstall')}</Button>
            </>
          )}
          {state === 'error' && (
            <>
              <Button variant="outline" onClick={dismiss}>
                {t('updater.btnClose')}
              </Button>
              <Button onClick={onRetry}>{t('updater.btnRetry')}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
