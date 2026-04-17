import { Button } from '@/components/ui/button'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { Check, Trash2 } from 'lucide-react'

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
