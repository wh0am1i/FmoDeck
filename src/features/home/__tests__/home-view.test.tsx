import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TodayStats } from '../components/today-stats'
import { HomeView } from '../home-view'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'

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

describe('HomeView 冒烟', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
  })

  it('渲染 hero + 今日统计 + 名册/频谱面板', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    )
    expect(screen.getByTestId('speaker-hero')).toHaveTextContent('BG5HXX')
    expect(screen.getByTestId('today-people')).toBeInTheDocument()
    expect(screen.getByText('讲话名册')).toBeInTheDocument()
    expect(screen.getByText('实时频谱')).toBeInTheDocument()
  })
})
