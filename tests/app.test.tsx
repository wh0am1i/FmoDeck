import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { APP_VERSION } from '@/lib/utils/app-version'

// 首页满屏地图依赖 leaflet；jsdom 无法真实渲染，mock 掉。
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

/** 经首页 ☰ 菜单跳到某页。 */
async function gotoViaMenu(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: '页面菜单' }))
  await user.click(screen.getByRole('menuitem', { name: label }))
}

/** 进入全屏值守屏（默认落地日志页，经 Nav 的"值守"tab）。 */
async function gotoDashboard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('link', { name: '值守' }))
}

describe('App 烟雾测试', () => {
  it('默认落地日志页，Header / Nav / SpeakingBar 正常渲染', () => {
    render(<App />)
    expect(screen.getByText('[ FMODECK ]')).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByLabelText('讲话状态栏')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('值守')
    expect(nav).toHaveTextContent('日志')
    expect(nav).toHaveTextContent('排行榜')
    expect(nav).toHaveTextContent('老朋友')
    expect(nav).toHaveTextContent('消息')
    expect(nav).toHaveTextContent('控制')
    expect(nav).toHaveTextContent('SSTV')
    expect(nav).toHaveTextContent('设置')
  })

  it('点值守 tab → 满屏仪表盘，不渲染 Header/Nav/Footer', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoDashboard(user)
    expect(screen.getByText('讲话名册')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '页面菜单' })).toBeInTheDocument()
    expect(screen.queryByText('[ FMODECK ]')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
  })

  it('值守屏经 ☰ 菜单跳排行榜', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoDashboard(user)
    await gotoViaMenu(user, '排行榜')
    expect(screen.getByText(/排行榜 TOP 20/)).toBeInTheDocument()
  })

  it('Nav 跳 SSTV，显示 offline 提示', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'SSTV' }))
    expect(screen.getByRole('heading', { name: 'SSTV' })).toBeInTheDocument()
    expect(screen.getByText(/未连接 FMO|音频未开启|音频连接中/)).toBeInTheDocument()
  })

  it('☰ 菜单不含值守自身入口', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoDashboard(user)
    await user.click(screen.getByRole('button', { name: '页面菜单' }))
    expect(screen.queryByRole('menuitem', { name: '值守' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '日志' })).toBeInTheDocument()
  })
})
