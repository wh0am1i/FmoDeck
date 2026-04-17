import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  /** 默认 false。true 时确认按钮为 destructive 红色风格，图标换警告标志。 */
  destructive?: boolean
  /** 操作进行中：按钮 disabled + 显示 "…ing" 文案。 */
  loading?: boolean
  loadingLabel?: ReactNode
  onConfirm: () => void | Promise<void>
}

/**
 * HUD 风格的确认对话框，用于替换 `window.confirm()`。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  loadingLabel,
  onConfirm
}: Props) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary flex items-center gap-2">
            {destructive && (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />
            )}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="hud-mono text-xs">{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn(destructive && 'gap-2')}
          >
            {loading && loadingLabel ? loadingLabel : (confirmLabel ?? t('common.confirm'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
