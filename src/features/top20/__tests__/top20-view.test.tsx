import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Top20View } from '../top20-view'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'
import type { QsoSummary } from '@/types/qso'

function render(ui: React.ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>)
}

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
    expect(screen.getByText(/离线/)).toBeInTheDocument()
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
    // 数量显示（数字和"次"单元分离渲染，按呼号所在行定位）
    expect(screen.getByRole('button', { name: /BG1ABC/ })).toHaveTextContent('6次')
    expect(screen.getByRole('button', { name: /BG2XYZ/ })).toHaveTextContent('3次')
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

  it('点击条目设置 logs filter 为该呼号', async () => {
    connectionStore.setState({ status: 'connected' })
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'BG1ABC' }),
        makeSummary({ logId: 2, toCallsign: 'BG1ABC' })
      ]
    })
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<Top20View />)
    await user.click(screen.getByRole('button', { name: /查看 BG1ABC/ }))
    expect(logsStore.getState().filter).toBe('BG1ABC')
  })

  it('syncMode=today 时只聚合今天的记录', () => {
    connectionStore.setState({ status: 'connected' })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartSec = Math.floor(todayStart.getTime() / 1000)

    logsStore.setState({
      syncMode: 'today',
      all: [
        // 昨天的 3 条
        makeSummary({ logId: 1, toCallsign: 'YESTERDAY', timestamp: todayStartSec - 3600 }),
        makeSummary({ logId: 2, toCallsign: 'YESTERDAY', timestamp: todayStartSec - 1800 }),
        makeSummary({ logId: 3, toCallsign: 'YESTERDAY', timestamp: todayStartSec - 900 }),
        // 今天的 1 条
        makeSummary({ logId: 4, toCallsign: 'TODAYONLY', timestamp: todayStartSec + 100 })
      ]
    })
    render(<Top20View />)
    expect(screen.getByText('TODAYONLY')).toBeInTheDocument()
    expect(screen.queryByText('YESTERDAY')).not.toBeInTheDocument()
    expect(screen.getByText(/今天/)).toBeInTheDocument()
    expect(screen.getByText(/排除 3 条/)).toBeInTheDocument()
  })
})
