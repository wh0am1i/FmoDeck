import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FmoApiClient } from './client'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1
  readyState = 0
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  close() {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }

  send(data: string) {
    this.sent.push(data)
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  // @ts-expect-error 覆写全局
  globalThis.WebSocket = MockWebSocket
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function connected(): Promise<{ client: FmoApiClient; ws: MockWebSocket }> {
  const client = new FmoApiClient('ws://fmo.local/ws')
  const p = client.connect()
  MockWebSocket.instances[0]!.open()
  await p
  return { client, ws: MockWebSocket.instances[0]! }
}

describe('FmoApiClient · 连接', () => {
  it('connect() 在 open 事件后 resolve', async () => {
    const { client } = await connected()
    expect(client.isConnected).toBe(true)
  })

  it('disconnect() 关闭 WebSocket', async () => {
    const { client } = await connected()
    client.disconnect()
    expect(client.isConnected).toBe(false)
  })
})

describe('FmoApiClient · 请求（串行队列）', () => {
  it('send() 收到匹配的 Response 后 resolve', async () => {
    const { client, ws } = await connected()
    const p = client.send({ type: 'station', subType: 'getCurrent' })
    ws.emit({
      type: 'station',
      subType: 'getCurrentResponse',
      code: 0,
      data: { uid: 'relay-1' }
    })
    const resp = await p
    expect(resp).toMatchObject({ code: 0, data: { uid: 'relay-1' } })
  })

  it('多个请求按顺序发送（同时只 in-flight 1 个）', async () => {
    const { client, ws } = await connected()
    const p1 = client.send({ type: 'qso', subType: 'getList' })
    const p2 = client.send({ type: 'message', subType: 'getList' })

    // 只有第一个请求已经 in-flight
    expect(ws.sent).toHaveLength(1)
    expect(JSON.parse(ws.sent[0]!)).toMatchObject({ type: 'qso', subType: 'getList' })

    // 响应第一个
    ws.emit({ type: 'qso', subType: 'getListResponse', code: 0, data: 'q' })
    await p1
    // 第二个现在应该发出
    expect(ws.sent).toHaveLength(2)
    expect(JSON.parse(ws.sent[1]!)).toMatchObject({ type: 'message', subType: 'getList' })

    ws.emit({ type: 'message', subType: 'getListResponse', code: 0, data: 'm' })
    const r2 = await p2
    expect(r2.data).toBe('m')
  })

  it('请求超时拒绝 Promise 并处理下一个', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', { requestTimeoutMs: 1000 })
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p

    const req = client.send({ type: 'station', subType: 'getCurrent' })
    vi.advanceTimersByTime(1500)
    await expect(req).rejects.toThrow(/timeout/i)
    vi.useRealTimers()
  })

  it('推送消息（非响应）分发给 onPush 监听者', async () => {
    const { client, ws } = await connected()
    const received: unknown[] = []
    client.onPush((msg) => received.push(msg))

    // 无 in-flight 时的推送
    ws.emit({ type: 'message', subType: 'summary', code: 0, data: { id: 'x' } })
    expect(received).toHaveLength(1)
  })
})

describe('FmoApiClient · 重连', () => {
  it('意外断连后按指数退避重连', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', {
      reconnect: { initialDelayMs: 100, maxDelayMs: 1000, maxAttempts: 3 }
    })
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p
    expect(MockWebSocket.instances).toHaveLength(1)

    MockWebSocket.instances[0]!.close()
    vi.advanceTimersByTime(100)
    expect(MockWebSocket.instances).toHaveLength(2)
    MockWebSocket.instances[1]!.close()
    vi.advanceTimersByTime(200)
    expect(MockWebSocket.instances).toHaveLength(3)
    vi.useRealTimers()
  })

  it('主动 disconnect() 不触发重连', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', {
      reconnect: { initialDelayMs: 100, maxDelayMs: 1000, maxAttempts: 5 }
    })
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p
    client.disconnect()
    vi.advanceTimersByTime(5000)
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })

  it('断连时清空队列并拒绝 Promise', async () => {
    const { client, ws } = await connected()
    const p1 = client.send({ type: 'station', subType: 'getCurrent' })
    const p2 = client.send({ type: 'qso', subType: 'getList' })
    ws.close()
    await expect(p1).rejects.toThrow(/closed/i)
    await expect(p2).rejects.toThrow(/closed/i)
  })
})
