import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendMock = vi.fn<(req: unknown) => Promise<{ success: boolean; message: string }>>()

vi.mock('@/lib/aprs-gateway/client', () => ({
  AprsGatewayClient: class {
    send(req: unknown) {
      return sendMock(req)
    }
  }
}))

const { aprsStore, resetAprsForTest } = await import('./store')

beforeEach(() => {
  sendMock.mockReset()
  resetAprsForTest()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('aprs store · setParams', () => {
  it('patch 合并字段', () => {
    aprsStore.getState().setParams({ mycall: 'BA0AX-5', passcode: 'abc' })
    expect(aprsStore.getState().mycall).toBe('BA0AX-5')
    expect(aprsStore.getState().passcode).toBe('abc')
  })
})

describe('aprs store · sendCommand', () => {
  beforeEach(() => {
    aprsStore.getState().setParams({
      mycall: 'BA0AX-5',
      passcode: '12345',
      secret: 'ABCDEFGHJKLM',
      tocall: 'BY4SDL'
    })
  })

  it('缺少呼号时抛错', async () => {
    aprsStore.getState().setParams({ mycall: '' })
    await expect(aprsStore.getState().sendCommand('NORMAL')).rejects.toThrow(/呼号/)
  })

  it('缺少 passcode 抛错', async () => {
    aprsStore.getState().setParams({ passcode: '' })
    await expect(aprsStore.getState().sendCommand('NORMAL')).rejects.toThrow(/APRS Passcode/)
  })

  it('成功响应：status=success + 历史增加 send + success 两条', async () => {
    sendMock.mockResolvedValue({ success: true, message: '✅ OK' })
    await aprsStore.getState().sendCommand('NORMAL')
    const { status, lastMessage, history } = aprsStore.getState()
    expect(status).toBe('success')
    expect(lastMessage).toBe('✅ OK')
    expect(history).toHaveLength(2)
    expect(history[0]?.operationType).toBe('success')
    expect(history[1]?.operationType).toBe('send')
  })

  it('失败响应：status=error + 历史追加 fail', async () => {
    sendMock.mockResolvedValue({ success: false, message: 'passcode 错误' })
    await aprsStore.getState().sendCommand('NORMAL')
    expect(aprsStore.getState().status).toBe('error')
    expect(aprsStore.getState().history[0]?.operationType).toBe('fail')
  })

  it('网关抛错时 rethrow 并记录 fail 历史', async () => {
    sendMock.mockRejectedValue(new Error('timeout'))
    await expect(aprsStore.getState().sendCommand('NORMAL')).rejects.toThrow(/timeout/)
    expect(aprsStore.getState().status).toBe('error')
    expect(aprsStore.getState().history[0]?.operationType).toBe('fail')
  })

  it('历史最多保留 20 条', async () => {
    sendMock.mockResolvedValue({ success: true, message: 'ok' })
    for (let i = 0; i < 12; i++) {
      await aprsStore.getState().sendCommand('NORMAL')
    }
    // 每次 send 增加 2 条（send + success）→ 12 * 2 = 24 → 截断到 20
    expect(aprsStore.getState().history.length).toBe(20)
  })

  it('tocall 为空时默认等于 mycall', async () => {
    sendMock.mockResolvedValue({ success: true, message: 'ok' })
    aprsStore.getState().setParams({ tocall: '' })
    await aprsStore.getState().sendCommand('NORMAL')
    const lastSend = sendMock.mock.calls[0]?.[0] as { tocall: string; mycall: string }
    expect(lastSend.tocall).toBe('BA0AX-5')
    expect(lastSend.mycall).toBe('BA0AX-5')
  })
})

describe('aprs store · clearHistory', () => {
  it('清空历史记录', () => {
    aprsStore.setState({
      history: [
        {
          timestamp: '',
          operationType: 'send',
          message: 'x',
          raw: ''
        }
      ]
    })
    aprsStore.getState().clearHistory()
    expect(aprsStore.getState().history).toEqual([])
  })
})
