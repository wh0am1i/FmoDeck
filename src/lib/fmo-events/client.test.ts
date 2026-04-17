import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FmoEventsClient } from './client'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 0
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  open() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  emit(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  close() {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
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

describe('FmoEventsClient', () => {
  it('connect 建立 WebSocket', () => {
    const c = new FmoEventsClient('ws://fake/events')
    c.connect()
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0]?.url).toBe('ws://fake/events')
  })

  it('onEvent 接收单条 JSON 消息', () => {
    const c = new FmoEventsClient('ws://fake/events')
    const received: unknown[] = []
    c.onEvent((e) => received.push(e))
    c.connect()
    MockWebSocket.instances[0]!.open()
    MockWebSocket.instances[0]!.emit(
      JSON.stringify({ type: 'qso', subType: 'callsign', data: { callsign: 'BA0AX' } })
    )
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      type: 'qso',
      subType: 'callsign',
      data: { callsign: 'BA0AX' }
    })
  })

  it('粘连的 }{ 多 JSON 消息被正确拆分', () => {
    const c = new FmoEventsClient('ws://fake/events')
    const received: unknown[] = []
    c.onEvent((e) => received.push(e))
    c.connect()
    MockWebSocket.instances[0]!.open()
    // 两条粘连
    const concat = '{"type":"a","subType":"x","data":1}{"type":"b","subType":"y","data":2}'
    MockWebSocket.instances[0]!.emit(concat)
    expect(received).toHaveLength(2)
    expect(received).toMatchObject([
      { type: 'a', subType: 'x', data: 1 },
      { type: 'b', subType: 'y', data: 2 }
    ])
  })

  it('无效 JSON 片段被忽略', () => {
    const c = new FmoEventsClient('ws://fake/events')
    const received: unknown[] = []
    c.onEvent((e) => received.push(e))
    c.connect()
    MockWebSocket.instances[0]!.open()
    MockWebSocket.instances[0]!.emit('not valid json')
    expect(received).toHaveLength(0)
  })

  it('断连后按指数退避重连', () => {
    vi.useFakeTimers()
    const c = new FmoEventsClient('ws://fake/events', {
      initialDelayMs: 100,
      maxDelayMs: 1000,
      maxAttempts: 3
    })
    c.connect()
    MockWebSocket.instances[0]!.open()
    MockWebSocket.instances[0]!.close()
    vi.advanceTimersByTime(100)
    expect(MockWebSocket.instances).toHaveLength(2)
    MockWebSocket.instances[1]!.close()
    vi.advanceTimersByTime(200)
    expect(MockWebSocket.instances).toHaveLength(3)
    vi.useRealTimers()
  })

  it('disconnect 后不重连', () => {
    vi.useFakeTimers()
    const c = new FmoEventsClient('ws://fake/events', {
      initialDelayMs: 100,
      maxDelayMs: 1000,
      maxAttempts: 5
    })
    c.connect()
    MockWebSocket.instances[0]!.open()
    c.disconnect()
    vi.advanceTimersByTime(5000)
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })
})
