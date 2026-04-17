import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { settingsStore } from '@/stores/settings'
import { CallsignField } from './components/callsign-field'
import { FmoAddressDialog } from './components/fmo-address-dialog'
import { FmoAddressList } from './components/fmo-address-list'

export function SettingsView() {
  const protocol = settingsStore((s) => s.protocol)

  return (
    <div className="flex flex-col gap-6">
      <section className="hud-frame p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="hud-title text-primary">[ FMO ADDRESSES ]</h2>
          <FmoAddressDialog />
        </div>
        <FmoAddressList />
      </section>

      <section className="hud-frame p-6 flex flex-col gap-4">
        <h2 className="hud-title text-primary">[ IDENTITY ]</h2>
        <CallsignField />
      </section>

      <section className="hud-frame p-6 flex flex-col gap-2">
        <h2 className="hud-title text-primary">[ PROTOCOL ]</h2>
        <label className="hud-mono text-xs text-muted-foreground">
          WebSocket 协议（wss 需证书；内网 fmo.local 用 ws 即可）
        </label>
        <Select
          value={protocol}
          onValueChange={(v) => settingsStore.getState().setProtocol(v === 'wss' ? 'wss' : 'ws')}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ws">ws</SelectItem>
            <SelectItem value="wss">wss</SelectItem>
          </SelectContent>
        </Select>
      </section>
    </div>
  )
}
