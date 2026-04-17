import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AprsGatewayClient } from './client'

class MockWebSocket {
  static instances: MockWebSocket[] = []
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
    this.readyState = 1
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

describe('AprsGatewayClient.send', () => {
  it('open → send → receive 成功 resolve', async () => {
    const client = new AprsGatewayClient('wss://fake/ws')
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '12345',
      tocall: 'BY4SDL-0',
      rawPacket: 'dummy'
    })
    const ws = MockWebSocket.instances[0]!
    ws.open()
    expect(JSON.parse(ws.sent[0]!)).toMatchObject({
      type: 'send',
      mycall: 'BA0AX-5',
      waitAck: 20
    })
    ws.emit({ success: true, type: 'ack', message: 'OK', timestamp: '2026-04-17T10:00:00Z' })
    const resp = await p
    expect(resp.success).toBe(true)
    expect(resp.message).toBe('OK')
  })

  it('连接超时拒绝', async () => {
    vi.useFakeTimers()
    const client = new AprsGatewayClient('wss://fake/ws', { connectTimeoutMs: 1000 })
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '1',
      tocall: 'X',
      rawPacket: 'p'
    })
    vi.advanceTimersByTime(1500)
    await expect(p).rejects.toThrow(/connect timeout/)
    vi.useRealTimers()
  })

  it('响应超时拒绝', async () => {
    vi.useFakeTimers()
    const client = new AprsGatewayClient('wss://fake/ws', {
      responseTimeoutMs: 500
    })
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '1',
      tocall: 'X',
      rawPacket: 'p'
    })
    MockWebSocket.instances[0]!.open()
    vi.advanceTimersByTime(1000)
    await expect(p).rejects.toThrow(/response timeout/)
    vi.useRealTimers()
  })

  it('连接关闭无响应时拒绝', async () => {
    const client = new AprsGatewayClient('wss://fake/ws')
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '1',
      tocall: 'X',
      rawPacket: 'p'
    })
    const ws = MockWebSocket.instances[0]!
    ws.open()
    ws.close()
    await expect(p).rejects.toThrow(/closed before response/)
  })

  it('onerror 时拒绝', async () => {
    const client = new AprsGatewayClient('wss://fake/ws')
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '1',
      tocall: 'X',
      rawPacket: 'p'
    })
    const ws = MockWebSocket.instances[0]!
    ws.onerror?.(new Event('error'))
    await expect(p).rejects.toThrow(/WebSocket error/)
  })

  it('server 失败响应时 success=false（不抛错，由 UI 层处理）', async () => {
    const client = new AprsGatewayClient('wss://fake/ws')
    const p = client.send({
      mycall: 'BA0AX-5',
      passcode: '1',
      tocall: 'X',
      rawPacket: 'p'
    })
    MockWebSocket.instances[0]!.open()
    MockWebSocket.instances[0]!.emit({
      success: false,
      type: 'error',
      message: 'passcode 错误'
    })
    const resp = await p
    expect(resp.success).toBe(false)
    expect(resp.message).toBe('passcode 错误')
  })
})
