import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { computeAprsPasscode } from '@/lib/utils/aprs-passcode'
import { settingsStore } from '@/stores/settings'
import { Calculator, Copy } from 'lucide-react'

export function PasscodeCalculator() {
  const { t } = useTranslation()
  const savedCallsign = settingsStore((s) => s.currentCallsign)
  const [input, setInput] = useState(savedCallsign)
  const [result, setResult] = useState<number | null>(null)

  function compute() {
    const code = computeAprsPasscode(input)
    if (code < 0) {
      toast.error(t('passcode.enterCallsign'))
      return
    }
    setResult(code)
  }

  async function copy() {
    if (result === null) return
    try {
      await navigator.clipboard.writeText(String(result))
      toast.success(t('passcode.copied'))
    } catch {
      toast.error(t('passcode.copyFailed'))
    }
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="hud-title text-primary">{t('passcode.title')}</h2>
        <span className="hud-mono text-xs text-muted-foreground">{t('passcode.subtitle')}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1 min-w-48">
          <label htmlFor="passcode-input" className="hud-mono text-xs text-muted-foreground">
            {t('passcode.callsignLabel')}
          </label>
          <Input
            id="passcode-input"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') compute()
            }}
            placeholder="BA0AX"
          />
        </div>
        <Button onClick={compute} disabled={!input.trim()}>
          <Calculator className="h-4 w-4" />
          {t('passcode.compute')}
        </Button>
      </div>
      {result !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-primary bg-primary/10 px-4 py-3">
          <span className="hud-mono text-xs text-muted-foreground">{t('passcode.label')}</span>
          <span className="hud-mono text-2xl font-bold tracking-wider text-primary">{result}</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            <Copy className="h-4 w-4" />
            {t('common.copy')}
          </Button>
        </div>
      )}
    </section>
  )
}
