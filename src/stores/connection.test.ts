import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class MockFmoApiClient {
  static instances: MockFmoApiClient[] = []
  static connectImpl: () => Promise<void> = () => Promise.resolve()
  url: string
  disconnected = false

  constructor(url: string) {
    this.url = url
    MockFmoApiClient.instances.push(this)
  }

  connect(): Promise<void> {
    return MockFmoApiClient.connectImpl()
  }

  disconnect(): void {
    this.disconnected = true
  }
}

vi.mock('@/lib/fmo-api/client', () => ({ FmoApiClient: MockFmoApiClient }))

// 必须在 mock 之后 import 才能拿到替换版
const { connectionStore, resetConnectionForTest } = await import('./connection')

beforeEach(() => {
  MockFmoApiClient.instances = []
  MockFmoApiClient.connectImpl = () => Promise.resolve()
})

afterEach(() => {
  resetConnectionForTest()
})

describe('connection store', () => {
  it('默认状态是 disconnected', () => {
    expect(connectionStore.getState().status).toBe('disconnected')
    expect(connectionStore.getState().client).toBeNull()
  })

  it('connect 成功时状态转为 connected 并创建 client', async () => {
    await connectionStore.getState().connect('ws://fmo.local/ws')
    expect(connectionStore.getState().status).toBe('connected')
    expect(connectionStore.getState().client).not.toBeNull()
    expect(connectionStore.getState().currentUrl).toBe('ws://fmo.local/ws')
  })

  it('connect 失败时状态转为 error + lastError', async () => {
    MockFmoApiClient.connectImpl = () => Promise.reject(new Error('boom'))
    await connectionStore.getState().connect('ws://bad/ws')
    expect(connectionStore.getState().status).toBe('error')
    expect(connectionStore.getState().lastError?.message).toBe('boom')
  })

  it('disconnect 清空 client 并转为 disconnected', async () => {
    await connectionStore.getState().connect('ws://fmo.local/ws')
    connectionStore.getState().disconnect()
    expect(connectionStore.getState().status).toBe('disconnected')
    expect(connectionStore.getState().client).toBeNull()
    expect(connectionStore.getState().currentUrl).toBeNull()
  })

  it('重复 connect 同一 URL 不重建 client', async () => {
    await connectionStore.getState().connect('ws://fmo.local/ws')
    const before = connectionStore.getState().client
    await connectionStore.getState().connect('ws://fmo.local/ws')
    expect(connectionStore.getState().client).toBe(before)
  })

  it('connect 到新 URL 时先断开旧的', async () => {
    await connectionStore.getState().connect('ws://a.local/ws')
    await connectionStore.getState().connect('ws://b.local/ws')
    expect(connectionStore.getState().currentUrl).toBe('ws://b.local/ws')
    expect(MockFmoApiClient.instances).toHaveLength(2)
    expect(MockFmoApiClient.instances[0]!.disconnected).toBe(true)
  })
})
