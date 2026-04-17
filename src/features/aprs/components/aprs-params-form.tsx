import { Input } from '@/components/ui/input'
import { aprsStore } from '../store'

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
      <Field
        id="aprs-passcode"
        label="APRS Passcode"
        hint="APRS-IS 网关登录密码"
        type="password"
        value={passcode}
        onChange={(v) => setParams({ passcode: v })}
      />
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
