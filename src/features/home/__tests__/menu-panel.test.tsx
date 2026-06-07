import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { MenuPanel } from '../components/menu-panel'

describe('MenuPanel', () => {
  it('点击 ☰ 展开全部页面入口（不含值守屏自身）', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MenuPanel />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: '页面菜单' }))
    for (const label of ['日志', '排行榜', '老朋友', '消息', '频谱', '控制', 'SSTV', '设置']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('menuitem', { name: '值守' })).not.toBeInTheDocument()
  })
})
