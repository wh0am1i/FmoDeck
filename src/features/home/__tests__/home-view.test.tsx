import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { TodayStats } from '../components/today-stats'
import { HomeView } from '../home-view'
import { logsStore, resetLogsForTest } from '@/features/logs/store'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'
import { resetSelfForTest } from '@/stores/self'
import { resetSettingsForTest } from '@/stores/settings'

// HomeView 渲染 LocationMap（依赖 leaflet）；jsdom 无法真实渲染地图，mock 掉。
vi.mock('leaflet', () => {
  const chainable: Record<string, unknown> = {}
  const ret = () => chainable
  Object.assign(chainable, {
    addTo: ret,
    setView: ret,
    fitBounds: ret,
    remove: ret,
    pad: ret,
    clearLayers: ret,
    invalidateSize: ret
  })
  return {
    default: {
      map: ret,
      tileLayer: ret,
      circleMarker: ret,
      polyline: ret,
      latLngBounds: ret,
      layerGroup: ret,
      point: ret,
      marker: ret,
      divIcon: ret
    }
  }
})

function renderHome() {
  return render(
    <MemoryRouter>
      <HomeView />
    </MemoryRouter>
  )
}

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

describe('HomeView v3 满屏仪表盘', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
    resetSelfForTest()
    resetSettingsForTest()
  })

  it('渲染地图 + 四浮层（hero/时钟/菜单/名册）', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    renderHome()
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.getByTestId('speaker-hero')).toHaveTextContent('BG5HXX')
    expect(screen.getByTestId('clock-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '页面菜单' })).toBeInTheDocument()
    expect(screen.getByText('讲话名册')).toBeInTheDocument()
  })

  it('浅色主题下进入首页强制深色，卸载时还原', () => {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
    const { unmount } = renderHome()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    unmount()
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    document.documentElement.classList.remove('light', 'dark')
  })

  it('无讲话者也渲染地图（idle 默认视角）', () => {
    renderHome()
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.getByTestId('speaker-hero')).toHaveAttribute('data-mode', 'empty')
  })

  it('手机竖屏 → 只渲染旋转提示，不渲染浮层', () => {
    const original = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('portrait'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
      })
    })
    try {
      renderHome()
      expect(screen.getByTestId('portrait-hint')).toBeInTheDocument()
      expect(screen.queryByTestId('speaker-hero')).not.toBeInTheDocument()
      expect(screen.queryByTestId('location-map')).not.toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: original })
    }
  })
})
