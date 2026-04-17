import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { computeAprsPasscode } from '@/lib/utils/aprs-passcode'
import { toast } from 'sonner'
import { aprsStore } from '../store'
import { Calculator } from 'lucide-react'

function Field({
  id,
  label,
  hint,
  value,
  type = 'text',
  onChange
}: {
  id: string
  label: string
  hint?: string
  value: string
  type?: 'text' | 'password'
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="hud-mono text-xs text-muted-foreground">
        {label}
      </label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hud-mono text-xs text-muted-foreground/60">{hint}</span>}
    </div>
  )
}

export function AprsParamsForm() {
  const mycall = aprsStore((s) => s.mycall)
  const passcode = aprsStore((s) => s.passcode)
  const secret = aprsStore((s) => s.secret)
  const tocall = aprsStore((s) => s.tocall)
  const gatewayUrl = aprsStore((s) => s.gatewayUrl)

  const setParams = aprsStore.getState().setParams

  function autoPasscode() {
    const code = computeAprsPasscode(mycall)
    if (code < 0) {
      toast.error('请先填写登录呼号')
      return
    }
    setParams({ passcode: String(code) })
    toast.success(`Passcode 已根据呼号计算: ${code}`)
  }

  const canCompute = mycall.trim().length > 0

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        id="aprs-mycall"
        label="登录呼号（CALL-SSID）"
        hint="例：BA0AX-5"
        value={mycall}
        onChange={(v) => setParams({ mycall: v.toUpperCase() })}
      />
      <Field
        id="aprs-tocall"
        label="目标呼号（留空则使用登录呼号）"
        value={tocall}
        onChange={(v) => setParams({ tocall: v.toUpperCase() })}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="aprs-passcode" className="hud-mono text-xs text-muted-foreground">
            APRS Passcode
          </label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={autoPasscode}
            disabled={!canCompute}
            className="hud-mono gap-1 text-xs"
            title={canCompute ? '根据登录呼号自动计算' : '请先填登录呼号'}
          >
            <Calculator className="h-3 w-3" />
            计算
          </Button>
        </div>
        <Input
          id="aprs-passcode"
          type="password"
          value={passcode}
          onChange={(e) => setParams({ passcode: e.target.value })}
        />
        <span className="hud-mono text-xs text-muted-foreground/60">
          APRS-IS 网关登录密码（可点&ldquo;计算&rdquo;按钮由呼号派生）
        </span>
      </div>

      <Field
        id="aprs-secret"
        label="设备密钥"
        hint="12 位大写字母/数字，用于 HMAC 签名"
        type="password"
        value={secret}
        onChange={(v) => setParams({ secret: v })}
      />
      <div className="md:col-span-2">
        <Field
          id="aprs-gateway"
          label="APRS 网关 URL"
          value={gatewayUrl}
          onChange={(v) => setParams({ gatewayUrl: v })}
        />
      </div>
    </div>
  )
}
