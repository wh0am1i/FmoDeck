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
      point: ret
    }
  }
})

/** 经首页 ☰ 菜单跳到某页。 */
async function gotoViaMenu(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: '页面菜单' }))
  await user.click(screen.getByRole('menuitem', { name: label }))
}

describe('App 烟雾测试', () => {
  it('默认渲染首页满屏仪表盘，不渲染 Header/Nav/Footer', () => {
    render(<App />)
    expect(screen.getByText('讲话名册')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '页面菜单' })).toBeInTheDocument()
    expect(screen.queryByText('[ FMODECK ]')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
  })

  it('经 ☰ 菜单跳日志页后，Header / Nav / SpeakingBar 正常渲染', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoViaMenu(user, '日志')
    expect(screen.getByText('[ FMODECK ]')).toBeInTheDocument()
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByLabelText('讲话状态栏')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('日志')
    expect(nav).toHaveTextContent('排行榜')
    expect(nav).toHaveTextContent('老朋友')
    expect(nav).toHaveTextContent('消息')
    expect(nav).toHaveTextContent('控制')
    expect(nav).toHaveTextContent('SSTV')
    expect(nav).toHaveTextContent('设置')
  })

  it('经 ☰ 菜单跳排行榜', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoViaMenu(user, '排行榜')
    expect(screen.getByText(/排行榜 TOP 20/)).toBeInTheDocument()
  })

  it('经 ☰ 菜单跳 SSTV，显示 offline 提示', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoViaMenu(user, 'SSTV')
    expect(screen.getByRole('heading', { name: 'SSTV' })).toBeInTheDocument()
    expect(screen.getByText(/未连接 FMO|音频未开启|音频连接中/)).toBeInTheDocument()
  })

  it('从其他页经 Nav 点首页 tab 回到满屏仪表盘', async () => {
    const user = userEvent.setup()
    render(<App />)
    await gotoViaMenu(user, '日志')
    await user.click(screen.getByRole('link', { name: '首页' }))
    expect(screen.getByRole('button', { name: '页面菜单' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument()
  })
})
