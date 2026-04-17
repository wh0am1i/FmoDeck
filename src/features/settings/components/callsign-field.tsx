import { Input } from '@/components/ui/input'
import { isValidChineseCallsign } from '@/lib/utils/callsign'
import { settingsStore } from '@/stores/settings'
import { cn } from '@/lib/utils'

export function CallsignField() {
  const call = settingsStore((s) => s.currentCallsign)
  const empty = call.length === 0
  const valid = empty || isValidChineseCallsign(call)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="callsign" className="hud-mono text-xs text-muted-foreground">
        登录呼号（大写，支持 SSID 后缀）
      </label>
      <Input
        id="callsign"
        value={call}
        onChange={(e) => settingsStore.getState().setCurrentCallsign(e.target.value)}
        placeholder="BA0AX 或 BA0AX-5"
        className={cn(!valid && 'border-destructive')}
        aria-invalid={!valid}
      />
      {!valid && (
        <span className="hud-mono text-xs text-destructive">
          呼号格式不正确（示例 BA0AX 或 BY4SDL-3）
        </span>
      )}
    </div>
  )
}
