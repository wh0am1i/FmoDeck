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

      // 浏览器 WebSocket `onerror` 出于安全原因不暴露细节；
      // 真正信息在 `onclose` 的 `code` / `reason`，统一在那里产错
      ws.onerror = () => {
        // 标记发生过 error；实际 reject 留给 onclose 拿到 code/reason
      }

      ws.onclose = (ev) => {
        if (!done) {
          const code = ev.code
          const reason = ev.reason || describeCloseCode(code)
          finish(() => reject(new Error(`APRS 网关连接关闭（code=${code}）：${reason}`)))
        }
      }
    })
  }
}

/** 根据 WebSocket close code 映射到可读说明。参考 RFC 6455 §7.4.1。 */
function describeCloseCode(code: number): string {
  switch (code) {
    case 1000:
      return '正常关闭'
    case 1001:
      return '端点离开'
    case 1002:
      return '协议错误'
    case 1003:
      return '不接受的数据类型'
    case 1006:
      return '异常关闭（网络中断或对方未发 close 帧 · 可能被防火墙/代理拦截 · 证书/Origin 被网关拒绝）'
    case 1008:
      return '违反策略（可能是 Origin 或 IP 被拒）'
    case 1011:
      return '服务器内部错误'
    case 1015:
      return 'TLS 握手失败（证书问题）'
    default:
      return code >= 4000 ? '应用层关闭（服务器自定义）' : '未知原因'
  }
}
