import { LocalControl } from './components/local-control'
import { PasscodeCalculator } from './components/passcode-calculator'

/**
 * "APRS" 视图：
 * - 本地控制（直连 fmo.local /ws，无需签名）
 * - Passcode 计算器（独立工具，和发消息无关）
 *
 * 历史上的 APRS 远程控制（走 APRS-IS gateway + HMAC 签名）已移除 —
 * 本地控制覆盖日常需求，远程链路复杂且不稳定。
 */
export function AprsView() {
  return (
    <div className="flex flex-col gap-6">
      <LocalControl />
      <PasscodeCalculator />
    </div>
  )
}
