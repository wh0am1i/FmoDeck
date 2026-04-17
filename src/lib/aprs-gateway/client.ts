export interface AprsSendRequest {
  mycall: string
  passcode: string
  tocall: string
  rawPacket: string
  /** 等待 ACK 秒数，默认 20 */
  waitAck?: number
}

export interface AprsSendResponse {
  success: boolean
  type: string
  message: string
  raw?: string
  timestamp?: string
}

export interface AprsGatewayOptions {
  connectTimeoutMs?: number
  /** 默认不超过 waitAck + 5 秒 */
  responseTimeoutMs?: number
}

/**
 * APRS 网关 WebSocket 客户端（如 wss://fmoac.srv.ink/api/ws）。
 *
 * 协议（对照 FmoLogs useAprsControl.js L487–514 / L415–439）：
 * - 请求：`{type:'send', mycall, passcode, tocall, rawPacket, waitAck}`
 * - 响应：`{success, type, message, raw?, timestamp?}`
 *
 * 策略：**每次 send 单次性连接**（open → send → receive → close）。
 * APRS 控制指令发送频率低（人工触发），不保持长连。
 */
export class AprsGatewayClient {
  constructor(
    private readonly url: string,
    private readonly opts: AprsGatewayOptions = {}
  ) {}

  send(req: AprsSendRequest): Promise<AprsSendResponse> {
    const connectTimeout = this.opts.connectTimeoutMs ?? 10_000
    const waitAck = req.waitAck ?? 20
    const responseTimeout = this.opts.responseTimeoutMs ?? (waitAck + 5) * 1000

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      let connectTimer: ReturnType<typeof setTimeout> | null = null
      let responseTimer: ReturnType<typeof setTimeout> | null = null
      let done = false

      const cleanup = () => {
        if (connectTimer) clearTimeout(connectTimer)
        if (responseTimer) clearTimeout(responseTimer)
      }

      const finish = (fn: () => void) => {
        if (done) return
        done = true
        cleanup()
        fn()
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      }

      connectTimer = setTimeout(() => {
        finish(() => reject(new Error('APRS gateway connect timeout')))
      }, connectTimeout)

      ws.onopen = () => {
        if (connectTimer) {
          clearTimeout(connectTimer)
          connectTimer = null
        }
        // 显式构造 payload（避免 `...req` 把 undefined 覆盖默认值）
        ws.send(
          JSON.stringify({
            type: 'send',
            mycall: req.mycall,
            passcode: req.passcode,
            tocall: req.tocall,
            rawPacket: req.rawPacket,
            waitAck
          })
        )
        responseTimer = setTimeout(() => {
          finish(() => reject(new Error('APRS gateway response timeout')))
        }, responseTimeout)
      }

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as AprsSendResponse
          finish(() => resolve(data))
        } catch (err) {
          finish(() => reject(new Error(`Invalid APRS response: ${String(err)}`)))
        }
      }

      ws.onerror = () => {
        finish(() => reject(new Error('APRS gateway WebSocket error')))
      }

      ws.onclose = () => {
        if (!done) {
          finish(() => reject(new Error('APRS gateway closed before response')))
        }
      }
    })
  }
}
