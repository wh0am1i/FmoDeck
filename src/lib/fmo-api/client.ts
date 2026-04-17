import type { FmoRequest, FmoResponse } from '@/types/fmo-protocol'

export interface ReconnectOptions {
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
}

export interface FmoClientOptions {
  requestTimeoutMs?: number
  reconnect?: ReconnectOptions
}

const DEFAULT_RECONNECT: ReconnectOptions = {
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxAttempts: 10
}

interface QueuedRequest {
  req: FmoRequest
  resolve: (value: FmoResponse) => void
  reject: (reason: unknown) => void
}

interface InFlightRequest extends QueuedRequest {
  timer: ReturnType<typeof setTimeout>
}

/**
 * FMO WebSocket 客户端（路线 B · 串行队列）。
 *
 * fmo.local 服务端不回传 reqId（见 plan §附录 · Task 1 探测结果），
 * 故采用 FmoLogs 同款策略：同时只 in-flight 1 个请求，按
 * `${subType}Response === ${requestSubType}Response` 匹配响应。
 *
 * 具备：指数退避自动重连、连接关闭时清空队列、请求超时保护、推送监听。
 */
export class FmoApiClient {
  private ws: WebSocket | null = null
  private readonly queue: QueuedRequest[] = []
  private inFlight: InFlightRequest | null = null
  private readonly requestTimeoutMs: number
  private readonly reconnectOpts: ReconnectOptions
  private reconnectAttempts = 0
  private shouldReconnect = false
  private connectPromise: Promise<void> | null = null
  private readonly listeners = new Set<(msg: FmoResponse) => void>()

  constructor(
    private readonly url: string,
    opts: FmoClientOptions = {}
  ) {
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10_000
    this.reconnectOpts = opts.reconnect ?? DEFAULT_RECONNECT
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise
    this.shouldReconnect = true
    this.connectPromise = this.doConnect()
    return this.connectPromise
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      ws.onopen = () => {
        this.reconnectAttempts = 0
        resolve()
      }
      ws.onmessage = (ev) => this.handleMessage(ev)
      ws.onclose = () => {
        this.failAllPending(new Error('WebSocket closed'))
        if (this.shouldReconnect) this.scheduleReconnect()
      }
      ws.onerror = () => reject(new Error('WebSocket error'))
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOpts.maxAttempts) return
    const delay = Math.min(
      this.reconnectOpts.initialDelayMs * 2 ** this.reconnectAttempts,
      this.reconnectOpts.maxDelayMs
    )
    this.reconnectAttempts++
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connectPromise = this.doConnect().catch(() => undefined) as Promise<void>
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.failAllPending(new Error('Client disconnected'))
    this.ws?.close()
    this.ws = null
    this.connectPromise = null
  }

  /**
   * 发送请求，入队等待。同时只有 1 个 in-flight；响应按 subType 匹配。
   */
  send(req: FmoRequest): Promise<FmoResponse> {
    if (!this.isConnected) return Promise.reject(new Error('Not connected'))
    return new Promise((resolve, reject) => {
      this.queue.push({ req, resolve, reject })
      this.processQueue()
    })
  }

  private processQueue(): void {
    if (this.inFlight || this.queue.length === 0) return
    const next = this.queue.shift()!
    const timer = setTimeout(() => {
      if (this.inFlight === flight) {
        this.inFlight = null
        next.reject(new Error(`Request timeout: ${next.req.type}/${next.req.subType}`))
        this.processQueue()
      }
    }, this.requestTimeoutMs)
    const flight: InFlightRequest = { ...next, timer }
    this.inFlight = flight
    this.ws!.send(JSON.stringify(next.req))
  }

  private handleMessage(ev: MessageEvent): void {
    let msg: FmoResponse
    try {
      msg = JSON.parse(ev.data as string) as FmoResponse
    } catch {
      return
    }

    // 先尝试匹配 in-flight 请求：
    //   响应的 subType 必须是请求的 `${subType}Response`（FmoLogs 同款约定）
    if (this.inFlight) {
      const reqSubType = this.inFlight.req.subType
      const responseSubType = `${reqSubType}Response`
      if (
        msg.type === this.inFlight.req.type &&
        (msg.subType === responseSubType || msg.subType === reqSubType)
      ) {
        clearTimeout(this.inFlight.timer)
        const resolve = this.inFlight.resolve
        this.inFlight = null
        resolve(msg)
        this.processQueue()
        return
      }
    }

    // 非响应：视为服务端推送
    this.listeners.forEach((cb) => cb(msg))
  }

  onPush(listener: (msg: FmoResponse) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private failAllPending(error: Error): void {
    if (this.inFlight) {
      clearTimeout(this.inFlight.timer)
      this.inFlight.reject(error)
      this.inFlight = null
    }
    for (const q of this.queue) q.reject(error)
    this.queue.length = 0
  }
}
