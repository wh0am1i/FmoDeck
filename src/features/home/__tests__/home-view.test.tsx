import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TodayStats } from '../components/today-stats'
import { HomeView } from '../home-view'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'
import { selfStore, resetSelfForTest } from '@/stores/self'
import { settingsStore, resetSettingsForTest } from '@/stores/settings'

// HomeView 渲染 LocationMap（依赖 leaflet）；jsdom 无法真实渲染地图，mock 掉。
vi.mock('leaflet', () => {
  const chainable: Record<string, unknown> = {}
  const ret = () => chainable
  Object.assign(chainable, {
    addTo: ret,
    setView: ret,
    fitBounds: ret,
    remove: ret,
    pad: ret
  })
  return {
    default: {
      map: ret,
      tileLayer: ret,
      circleMarker: ret,
      polyline: ret,
      latLngBounds: ret
    }
  }
})

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
    resetSelfForTest()
  })

  it('渲染 hero + 今日统计 + 名册/频谱面板', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    )
    expect(screen.getByTestId('speaker-hero')).toHaveTextContent('BG5HXX')
    expect(screen.getByText('讲话名册')).toBeInTheDocument()
  })
})

describe('HomeView 地图', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
    resetSelfForTest()
    resetSettingsForTest()
  })

  it('自己讲话 → 地图仍渲染（定位到自己单点，非占位）', () => {
    settingsStore.getState().setCurrentCallsign('BG5HXX')
    selfStore.getState().setCoordinate({ lat: 36, lng: 103 })
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    )
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.queryByText('暂无对方位置')).not.toBeInTheDocument()
  })

  it('有对方网格时 Row1 渲染地图', () => {
    selfStore.getState().setCoordinate({ lat: 36, lng: 103 })
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    )
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
  })

  it('无对方（empty）时不渲染地图，显示占位', () => {
    render(
      <MemoryRouter>
        <HomeView />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('location-map')).not.toBeInTheDocument()
    expect(screen.getByText('暂无对方位置')).toBeInTheDocument()
  })
})
