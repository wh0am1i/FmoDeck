import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { OldFriendsView } from '../old-friends-view'
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

describe('OldFriendsView', () => {
  it('未连接时显示 OFFLINE', () => {
    render(<OldFriendsView />)
    expect(screen.getByText(/OFFLINE/)).toBeInTheDocument()
  })

  it('连上但无日志时显示空态', () => {
    connectionStore.setState({ status: 'connected' })
    render(<OldFriendsView />)
    expect(screen.getByText(/暂无数据/)).toBeInTheDocument()
  })

  it('聚合按 toCallsign 次数和最近时间排序', () => {
    connectionStore.setState({ status: 'connected' })
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'FREQUENT', timestamp: 1000 }),
        makeSummary({ logId: 2, toCallsign: 'FREQUENT', timestamp: 2000 }),
        makeSummary({ logId: 3, toCallsign: 'FREQUENT', timestamp: 3000 }),
        makeSummary({ logId: 4, toCallsign: 'ONCE', timestamp: 5000 })
      ]
    })
    render(<OldFriendsView />)
    expect(screen.getByText('FREQUENT')).toBeInTheDocument()
    expect(screen.getByText('ONCE')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(rows[0]).toHaveTextContent('FREQUENT')
    expect(rows[0]).toHaveTextContent('3')
    expect(rows[1]).toHaveTextContent('ONCE')
  })

  it('搜索过滤按包含匹配', async () => {
    connectionStore.setState({ status: 'connected' })
    logsStore.setState({
      all: [
        makeSummary({ logId: 1, toCallsign: 'BG1ABC' }),
        makeSummary({ logId: 2, toCallsign: 'BY4SDL' })
      ]
    })
    const user = userEvent.setup()
    render(<OldFriendsView />)
    await user.type(screen.getByLabelText('过滤呼号'), 'bg')
    expect(screen.getByText('BG1ABC')).toBeInTheDocument()
    expect(screen.queryByText('BY4SDL')).not.toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()
  })

  it('分页：每页 20 条，25 位老朋友分 2 页', () => {
    connectionStore.setState({ status: 'connected' })
    // 25 个唯一呼号
    logsStore.setState({
      all: Array.from({ length: 25 }, (_, i) =>
        makeSummary({ logId: i, toCallsign: `BG${i.toString().padStart(4, '0')}` })
      )
    })
    render(<OldFriendsView />)
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()
  })

  it('syncMode=today 时按今天筛选', () => {
    connectionStore.setState({ status: 'connected' })
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartSec = Math.floor(todayStart.getTime() / 1000)

    logsStore.setState({
      syncMode: 'today',
      all: [
        makeSummary({ logId: 1, toCallsign: 'YESTERDAY', timestamp: todayStartSec - 3600 }),
        makeSummary({ logId: 2, toCallsign: 'TODAYONLY', timestamp: todayStartSec + 100 })
      ]
    })
    render(<OldFriendsView />)
    expect(screen.getByText('TODAYONLY')).toBeInTheDocument()
    expect(screen.queryByText('YESTERDAY')).not.toBeInTheDocument()
  })
})
