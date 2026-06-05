import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TodayStats } from '../components/today-stats'
import { logsStore, resetLogsForTest } from '@/features/logs/store'

describe('TodayStats', () => {
  beforeEach(() => resetLogsForTest())

  it('显示今日人数与 QSO 数', () => {
    const now = Math.floor(Date.now() / 1000)
    logsStore.setState({
      all: [
        { logId: 1, timestamp: now, toCallsign: 'BG5HXX', grid: '' },
        { logId: 2, timestamp: now - 5, toCallsign: 'BA0XYZ', grid: '' }
      ],
      local: []
    })
    render(<TodayStats />)
    expect(screen.getByTestId('today-people')).toHaveTextContent('2')
    expect(screen.getByTestId('today-qsos')).toHaveTextContent('2')
  })
})
