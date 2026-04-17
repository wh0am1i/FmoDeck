import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { computeAprsPasscode } from '@/lib/utils/aprs-passcode'
import { aprsStore } from '../store'
import { Calculator } from 'lucide-react'

function Field({
  id,
  label,
  hint,
  value,
  type = 'text',
  placeholder,
  onChange
}: {
  id: string
  label: string
  hint?: string
  value: string
  type?: 'text' | 'password'
  placeholder?: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="hud-mono text-xs text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="hud-mono text-xs text-muted-foreground/60">{hint}</span>}
    </div>
  )
}

export function AprsParamsForm() {
  const { t } = useTranslation()
  const mycall = aprsStore((s) => s.mycall)
  const passcode = aprsStore((s) => s.passcode)
  const secret = aprsStore((s) => s.secret)
  const tocall = aprsStore((s) => s.tocall)
  const gatewayUrl = aprsStore((s) => s.gatewayUrl)

  const setParams = aprsStore.getState().setParams

  function autoPasscode() {
    const code = computeAprsPasscode(mycall)
    if (code < 0) {
      toast.error(t('aprsRemote.formPasscodeNeedCall'))
      return
    }
    setParams({ passcode: String(code) })
    toast.success(t('aprsRemote.formPasscodeComputed', { code }))
  }

  const canCompute = mycall.trim().length > 0

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        id="aprs-mycall"
        label={t('aprsRemote.formMycallLabel')}
        hint={t('aprsRemote.formMycallHint')}
        placeholder={t('aprsRemote.formMycallPlaceholder')}
        value={mycall}
        onChange={(v) => setParams({ mycall: v.toUpperCase() })}
      />
      <Field
        id="aprs-tocall"
        label={t('aprsRemote.formTocallLabel')}
        hint={t('aprsRemote.formTocallHint')}
        placeholder={t('aprsRemote.formTocallPlaceholder')}
        value={tocall}
        onChange={(v) => setParams({ tocall: v.toUpperCase() })}
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="aprs-passcode" className="hud-mono text-xs text-muted-foreground">
            {t('aprsRemote.formPasscodeLabel')}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={autoPasscode}
            disabled={!canCompute}
            className="hud-mono gap-1 text-xs"
            title={
              canCompute
                ? t('aprsRemote.formPasscodeTitleReady')
                : t('aprsRemote.formPasscodeTitleNeedCall')
            }
          >
            <Calculator className="h-3 w-3" />
            {t('aprsRemote.formPasscodeCompute')}
          </Button>
        </div>
        <Input
          id="aprs-passcode"
          type="password"
          value={passcode}
          placeholder={t('aprsRemote.formPasscodePlaceholder')}
          onChange={(e) => setParams({ passcode: e.target.value })}
        />
        <span className="hud-mono text-xs text-muted-foreground/60">
          {t('aprsRemote.formPasscodeHint')}
        </span>
      </div>

      <Field
        id="aprs-secret"
        label={t('aprsRemote.formSecretLabel')}
        hint={t('aprsRemote.formSecretHint')}
        placeholder={t('aprsRemote.formSecretPlaceholder')}
        type="password"
        value={secret}
        onChange={(v) => setParams({ secret: v })}
      />
      <div className="md:col-span-2">
        <Field
          id="aprs-gateway"
          label={t('aprsRemote.formGatewayLabel')}
          placeholder={t('aprsRemote.formGatewayPlaceholder')}
          value={gatewayUrl}
          onChange={(v) => setParams({ gatewayUrl: v })}
        />
      </div>
    </div>
  )
}
