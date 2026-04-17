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
import { settingsStore } from '@/stores/settings'
import { Plus } from 'lucide-react'

export function FmoAddressDialog() {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState('')
  const [name, setName] = useState('')
  const hostValid = host.trim().length > 0

  function submit() {
    if (!hostValid) return
    settingsStore.getState().addAddress({
      id: nanoid(8),
      host: host.trim(),
      ...(name.trim() ? { name: name.trim() } : {})
    })
    setOpen(false)
    setHost('')
    setName('')
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
