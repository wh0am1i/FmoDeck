import { useState } from 'react'
import { nanoid } from 'nanoid'
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
import { Input } from '@/components/ui/input'
import { settingsStore, type SyncMode } from '@/stores/settings'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

function SyncModeRadio({ value, onChange }: { value: SyncMode; onChange: (m: SyncMode) => void }) {
  const options: { key: SyncMode; label: string; hint: string }[] = [
    { key: 'all', label: '全量同步', hint: '拉取服务器全部日志（默认 · 首次较慢）' },
    { key: 'today', label: '只同步当天', hint: '只保留本地时区今天的日志' },
    {
      key: 'incremental',
      label: '增量同步',
      hint: '只拉新增（基于已有最大 logId）· 刷新时最快'
    }
  ]
  return (
    <div role="radiogroup" aria-label="同步模式" className="flex flex-col gap-2">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cn(
              'hud-mono flex flex-col gap-0.5 rounded-sm border px-3 py-2 text-left text-sm',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-foreground hover:bg-primary/5'
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  'h-3 w-3 rounded-full border',
                  active ? 'border-primary bg-primary' : 'border-border'
                )}
                aria-hidden="true"
              />
              {o.label}
            </span>
            <span className="pl-5 text-xs text-muted-foreground">{o.hint}</span>
          </button>
        )
      })}
    </div>
  )
}

export function FmoAddressDialog() {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState('')
  const [name, setName] = useState('')
  const [syncMode, setSyncMode] = useState<SyncMode>('all')
  const hostValid = host.trim().length > 0

  function submit() {
    if (!hostValid) return
    settingsStore.getState().addAddress({
      id: nanoid(8),
      host: host.trim(),
      syncMode,
      ...(name.trim() ? { name: name.trim() } : {})
    })
    setOpen(false)
    setHost('')
    setName('')
    setSyncMode('all')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          添加地址
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">[ ADD FMO ADDRESS ]</DialogTitle>
          <DialogDescription className="hud-mono text-xs">
            添加一个新的 FMO 服务器地址。激活后自动尝试连接。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="hud-mono text-xs text-muted-foreground" htmlFor="fmo-host">
            Host（如 <code>fmo.local</code> 或 <code>192.168.1.10:8080</code>）
          </label>
          <Input
            id="fmo-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="fmo.local"
            autoFocus
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2" htmlFor="fmo-name">
            名称（可选）
          </label>
          <Input
            id="fmo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="家里的 FMO"
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2">同步模式</label>
          <SyncModeRadio value={syncMode} onChange={setSyncMode} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={!hostValid}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
