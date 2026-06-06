import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { QsoFeedPanel } from '../components/qso-feed-panel'
import { logsStore, resetLogsForTest } from '@/features/logs/store'

function renderFeed() {
  return render(
    <MemoryRouter>
      <QsoFeedPanel />
    </MemoryRouter>
  )
}

describe('QsoFeedPanel', () => {
  beforeEach(() => resetLogsForTest())

  it('空数据显示占位文案', () => {
    renderFeed()
    expect(screen.getByText('暂无日志记录')).toBeInTheDocument()
  })

  it('最多渲染 12 条，最新在前', () => {
    const now = 1750000000
    logsStore.setState({
      all: Array.from({ length: 14 }, (_, i) => ({
        logId: 14 - i,
        timestamp: now - i * 60,
        toCallsign: `BG${14 - i}AA`,
        grid: i % 2 === 0 ? 'OM89' : ''
      }))
    })
    renderFeed()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(12)
    expect(items[0]).toHaveTextContent('BG14AA')
    expect(items[11]).toHaveTextContent('BG3AA')
  })
})
