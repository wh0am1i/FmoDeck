import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LogsView } from '../logs-view'
import { logsStore, resetLogsForTest } from '../store'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'
import type { QsoSummary } from '@/types/qso'

function makeSummary(overrides: Partial<QsoSummary> = {}): QsoSummary {
  return {
    logId: 1,
    timestamp: 1776358502,
    toCallsign: 'BI2RCY',
    grid: 'PN11rr',
    ...overrides
  }
}

beforeEach(() => {
  resetLogsForTest()
  resetConnectionForTest()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LogsView · 未连接', () => {
  it('显示离线占位', () => {
    render(<LogsView />)
    expect(screen.getByText(/离线/)).toBeInTheDocument()
  })
})

describe('LogsView · 已连接', () => {
  beforeEach(() => {
    connectionStore.setState({
      status: 'connected',
      client: {} as never
    })
  })

  it('空记录时显示 NO RECORDS', () => {
    render(<LogsView />)
    expect(screen.getByText(/无记录/)).toBeInTheDocument()
  })

  it('有记录时显示表格 + 数量', () => {
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'BG1ABC' }),
        makeSummary({ logId: 2, toCallsign: 'BG2XYZ' })
      ]
    })
    render(<LogsView />)
    expect(screen.getByText(/2 条/)).toBeInTheDocument()
    expect(screen.getByText('BG1ABC')).toBeInTheDocument()
    expect(screen.getByText('BG2XYZ')).toBeInTheDocument()
  })

  it('过滤生效且显示 n / total', async () => {
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'BG1ABC' }),
        makeSummary({ logId: 2, toCallsign: 'BY4SDL' })
      ]
    })
    const user = userEvent.setup()
    render(<LogsView />)
    await user.type(screen.getByLabelText('过滤呼号'), 'BG')
    expect(screen.getByText(/1 \/ 2 条/)).toBeInTheDocument()
  })

  it('错误态显示错误消息', () => {
    logsStore.setState({
      status: 'error',
      error: new Error('boom')
    })
    render(<LogsView />)
    expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    expect(screen.getByText(/boom/)).toBeInTheDocument()
  })
})
