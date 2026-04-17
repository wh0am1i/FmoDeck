import { Button } from '@/components/ui/button'
import { settingsStore, type SyncMode } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { Check, Trash2 } from 'lucide-react'

const MODE_LABEL: Record<SyncMode, string> = {
  all: '全量',
  today: '仅当天',
  incremental: '增量'
}

/** 徽章点击的循环顺序：all → today → incremental → all。 */
const NEXT_MODE: Record<SyncMode, SyncMode> = {
  all: 'today',
  today: 'incremental',
  incremental: 'all'
}

export function FmoAddressList() {
  const addresses = settingsStore((s) => s.fmoAddresses)
  const activeId = settingsStore((s) => s.activeAddressId)

  if (addresses.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">
        [ NO ADDRESSES · 点&ldquo;添加地址&rdquo;开始 ]
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label="FMO 地址列表">
      {addresses.map((a) => {
        const isActive = a.id === activeId
        const mode: SyncMode = a.syncMode ?? 'all'
        const nextMode: SyncMode = NEXT_MODE[mode]
        return (
          <li
            key={a.id}
            className={cn(
              'flex items-center gap-3 rounded-sm border border-border px-3 py-2',
              isActive && 'bg-primary/10 border-primary'
            )}
          >
            <button
              type="button"
              onClick={() => settingsStore.getState().setActiveAddress(a.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border"
              aria-label={isActive ? '已激活' : `激活 ${a.host}`}
            >
              {isActive && <Check className="h-3 w-3 text-primary" />}
            </button>
            <div className="flex-1">
              <div className="hud-mono text-sm text-foreground">{a.host}</div>
              {a.name && <div className="hud-mono text-xs text-muted-foreground">{a.name}</div>}
            </div>
            <button
              type="button"
              onClick={() => settingsStore.getState().updateAddress(a.id, { syncMode: nextMode })}
              className={cn(
                'hud-mono rounded-sm border px-2 py-0.5 text-xs',
                mode === 'today' && 'border-accent bg-accent/10 text-accent',
                mode === 'incremental' && 'border-primary bg-primary/10 text-primary',
                mode === 'all' &&
                  'border-border text-muted-foreground hover:border-primary hover:text-primary'
              )}
              aria-label={`同步模式：${MODE_LABEL[mode]}（点击切换）`}
              title="点击切换同步模式"
            >
              {MODE_LABEL[mode]}
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => settingsStore.getState().removeAddress(a.id)}
              aria-label={`删除 ${a.host}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
