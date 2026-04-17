import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { computeAprsPasscode } from '@/lib/utils/aprs-passcode'
import { settingsStore } from '@/stores/settings'
import { Calculator, Copy } from 'lucide-react'

/**
 * 独立的 APRS-IS Passcode 计算器。
 * 输入呼号 → 按标准 aprsc 算法派生 5 位 passcode。
 */
export function PasscodeCalculator() {
  const savedCallsign = settingsStore((s) => s.currentCallsign)
  const [input, setInput] = useState(savedCallsign)
  const [result, setResult] = useState<number | null>(null)

  function compute() {
    const code = computeAprsPasscode(input)
    if (code < 0) {
      toast.error('请先输入呼号')
      return
    }
    setResult(code)
  }

  async function copy() {
    if (result === null) return
    try {
      await navigator.clipboard.writeText(String(result))
      toast.success('Passcode 已复制到剪贴板')
    } catch {
      toast.error('复制失败（浏览器权限受限）')
    }
  }

  return (
    <section className="hud-frame flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="hud-title text-primary">[ PASSCODE CALCULATOR ]</h2>
        <span className="hud-mono text-xs text-muted-foreground">
          标准 APRS-IS 算法 · 根据呼号派生登录密码
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1 min-w-48">
          <label htmlFor="passcode-input" className="hud-mono text-xs text-muted-foreground">
            呼号（SSID 后缀会被忽略）
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
          计算
        </Button>
      </div>
      {result !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-primary bg-primary/10 px-4 py-3">
          <span className="hud-mono text-xs text-muted-foreground">Passcode</span>
          <span className="hud-mono text-2xl font-bold tracking-wider text-primary">{result}</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            <Copy className="h-4 w-4" />
            复制
          </Button>
        </div>
      )}
    </section>
  )
}
