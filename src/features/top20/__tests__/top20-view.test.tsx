import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Top20View } from '../top20-view'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'
import type { QsoSummary } from '@/types/qso'

function makeSummary(overrides: Partial<QsoSummary> = {}): QsoSummary {
  return {
    logId: 1,
    timestamp: 1776358500,
    toCallsign: 'BA0AX',
    grid: 'OM89',
    ...overrides
  }
}

beforeEach(() => {
  resetLogsForTest()
  resetConnectionForTest()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Top20View', () => {
  it('未连接时显示 OFFLINE', () => {
    render(<Top20View />)
    expect(screen.getByText(/OFFLINE/)).toBeInTheDocument()
  })

  it('连上但无日志时显示空态', () => {
    connectionStore.setState({ status: 'connected' })
    render(<Top20View />)
    expect(screen.getByText(/暂无数据/)).toBeInTheDocument()
  })

  it('聚合按 toCallsign 次数排序并取前 20', () => {
    connectionStore.setState({ status: 'connected' })
    // 6 条 BG1，3 条 BG2，1 条 BG3 → 顺序 BG1 / BG2 / BG3
    const logs: QsoSummary[] = [
      ...Array.from({ length: 6 }, (_, i) =>
        makeSummary({ logId: i, toCallsign: 'BG1ABC', timestamp: 1000 + i })
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        makeSummary({ logId: 100 + i, toCallsign: 'BG2XYZ', timestamp: 2000 + i })
      ),
      makeSummary({ logId: 200, toCallsign: 'BG3PDQ', timestamp: 3000 })
    ]
    logsStore.setState({ all: logs })
    render(<Top20View />)

    expect(screen.getByText('BG1ABC')).toBeInTheDocument()
    expect(screen.getByText('BG2XYZ')).toBeInTheDocument()
    expect(screen.getByText('BG3PDQ')).toBeInTheDocument()
    // 数量显示
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('并列时按 lastTime 倒序', () => {
    connectionStore.setState({ status: 'connected' })
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'OLD', timestamp: 1000 }),
        makeSummary({ logId: 2, toCallsign: 'NEW', timestamp: 3000 })
      ]
    })
    render(<Top20View />)
    // "NEW" 应出现在 "OLD" 前（第 1 位）
    const listItems = screen.getAllByRole('listitem')
    expect(listItems[0]).toHaveTextContent('NEW')
    expect(listItems[1]).toHaveTextContent('OLD')
  })
})
