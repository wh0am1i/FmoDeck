/**
 * FMO `/events` WebSocket 客户端（事件推送流）。
 *
 * 与 `/ws`（请求-响应）分离：
 * - 服务器主动推送 QSO 事件（`callsign`/`history`）和消息摘要
 * - 无请求只有订阅；断连时指数退避重连
 *
 * 事件协议（探测于 ws://fmo.local/events）：
 *   `{type:'qso', subType:'callsign', data:{callsign, isSpeaking, isHost, grid}}`
 *   `{type:'qso', subType:'history', data:[{callsign, utcTime}, ...]}`
 *   （其他事件透传给 listener，上层自行处理）
 */

export interface FmoEvent {
  type: string
  subType: string
  data: unknown
  [k: string]: unknown
}

export interface ReconnectOptions {
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
}

const DEFAULT_RECONNECT: ReconnectOptions = {
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxAttempts: Number.POSITIVE_INFINITY
}

export class FmoEventsClient {
  private ws: WebSocket | null = null
  private readonly listeners = new Set<(ev: FmoEvent) => void>()
  private reconnectAttempts = 0
  private shouldReconnect = false

  constructor(
    private readonly url: string,
    private readonly reconnectOpts: ReconnectOptions = DEFAULT_RECONNECT
  ) {}

  connect(): void {
    this.shouldReconnect = true
    this.doConnect()
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.ws?.close()
    this.ws = null
  }

  onEvent(cb: (ev: FmoEvent) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private doConnect(): void {
    const ws = new WebSocket(this.url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
    }

    ws.onmessage = (ev) => {
      // 某些服务端可能连发 `}{` 粘连的 JSON 消息。此处按 `}{` 切分后分别解析。
      const raw = ev.data as string
      const parts = raw.split('}{')
      for (let i = 0; i < parts.length; i++) {
        let slice = parts[i]!
        if (parts.length > 1) {
          if (i === 0) slice = slice + '}'
          else if (i === parts.length - 1) slice = '{' + slice
          else slice = '{' + slice + '}'
        }
        try {
          const msg = JSON.parse(slice) as FmoEvent
          for (const cb of this.listeners) cb(msg)
        } catch {
          /* 忽略无法解析的片段 */
        }
      }
    }

    ws.onclose = () => {
      this.ws = null
      if (this.shouldReconnect) this.scheduleReconnect()
    }

    ws.onerror = () => {
      /* onclose 会自动触发 */
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOpts.maxAttempts) return
    const delay = Math.min(
      this.reconnectOpts.initialDelayMs * 2 ** this.reconnectAttempts,
      this.reconnectOpts.maxDelayMs
    )
    this.reconnectAttempts++
    setTimeout(() => {
      if (this.shouldReconnect) this.doConnect()
    }, delay)
  }
}
