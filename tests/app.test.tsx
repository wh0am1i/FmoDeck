import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/App'

describe('App 烟雾测试', () => {
  it('默认渲染 LOGS 视图', () => {
    render(<App />)
    expect(screen.getByText('[ LOGS ]')).toBeInTheDocument()
  })

  it('Header 显示应用标识和版本', () => {
    render(<App />)
    expect(screen.getByText('[ FMODECK ]')).toBeInTheDocument()
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })

  it('Nav 包含 5 个路由 tab', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('LOGS')
    expect(nav).toHaveTextContent('TOP 20')
    expect(nav).toHaveTextContent('OLD FRIENDS')
    expect(nav).toHaveTextContent('MSG')
    expect(nav).toHaveTextContent('SETTINGS')
  })

  it('点击 TOP 20 tab 切换视图', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'TOP 20' }))
    expect(screen.getByText('[ TOP 20 ]')).toBeInTheDocument()
  })

  it('SpeakingBar 占位渲染', () => {
    render(<App />)
    expect(screen.getByLabelText('讲话状态栏')).toBeInTheDocument()
  })
})
