import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/App'

describe('App 烟雾测试', () => {
  it('默认渲染 LOGS 视图', () => {
    render(<App />)
    expect(screen.getByText('[ 日志 ]')).toBeInTheDocument()
  })

  it('Header 显示应用标识和版本', () => {
    render(<App />)
    expect(screen.getByText('[ FMODECK ]')).toBeInTheDocument()
    expect(screen.getByText('v0.1.4')).toBeInTheDocument()
  })

  it('Nav 包含各路由 tab（zh-CN 标签）', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('日志')
    expect(nav).toHaveTextContent('排行榜')
    expect(nav).toHaveTextContent('老朋友')
    expect(nav).toHaveTextContent('消息')
    expect(nav).toHaveTextContent('控制')
    expect(nav).toHaveTextContent('设置')
  })

  it('点击排行榜 tab 切换视图', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: '排行榜' }))
    expect(screen.getByText(/排行榜 TOP 20/)).toBeInTheDocument()
  })

  it('SpeakingBar 占位渲染', () => {
    render(<App />)
    expect(screen.getByLabelText('讲话状态栏')).toBeInTheDocument()
  })
})
