import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from '../settings-view'
import { resetSettingsForTest, settingsStore } from '@/stores/settings'

beforeEach(() => {
  resetSettingsForTest()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsView', () => {
  it('空状态显示占位文本', () => {
    render(<SettingsView />)
    expect(screen.getByText(/暂无地址/)).toBeInTheDocument()
  })

  it('添加地址后显示在列表中', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: /添加地址/ }))
    const hostInput = await screen.findByPlaceholderText('fmo.local')
    await user.type(hostInput, 'fmo.local')
    await user.click(screen.getByRole('button', { name: '添加' }))

    expect(await screen.findByText('fmo.local')).toBeInTheDocument()
    expect(settingsStore.getState().fmoAddresses).toHaveLength(1)
  })

  it('点列表圆点激活地址', async () => {
    settingsStore.setState({
      fmoAddresses: [
        { id: '1', host: 'a.local' },
        { id: '2', host: 'b.local' }
      ],
      activeAddressId: '1'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: '激活 b.local' }))
    expect(settingsStore.getState().activeAddressId).toBe('2')
  })

  it('删除地址', async () => {
    settingsStore.setState({
      fmoAddresses: [{ id: '1', host: 'x.local' }]
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: '删除 x.local' }))
    expect(settingsStore.getState().fmoAddresses).toEqual([])
  })

  it('呼号非法时显示错误文本', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    const input = screen.getByLabelText(/登录呼号/)
    await user.type(input, 'INVALID')
    expect(await screen.findByText(/呼号格式不正确/)).toBeInTheDocument()
  })

  it('呼号合法时无错误文本', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    const input = screen.getByLabelText(/登录呼号/)
    await user.type(input, 'BA0AX')
    expect(screen.queryByText(/呼号格式不正确/)).not.toBeInTheDocument()
  })

  it('添加地址 Dialog 选择"只同步当天"后持久化到 syncMode', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: /添加地址/ }))
    await user.type(await screen.findByPlaceholderText('fmo.local'), 'fmo.local')
    await user.click(screen.getByRole('radio', { name: /只同步当天/ }))
    await user.click(screen.getByRole('button', { name: '添加' }))

    const addrs = settingsStore.getState().fmoAddresses
    expect(addrs).toHaveLength(1)
    expect(addrs[0]?.syncMode).toBe('today')
  })

  it('列表徽章点击循环 all → today → incremental → all', async () => {
    settingsStore.setState({
      fmoAddresses: [{ id: '1', host: 'fmo.local', syncMode: 'all' }]
    })
    const user = userEvent.setup()
    render(<SettingsView />)
    await user.click(screen.getByRole('button', { name: /同步模式：全量/ }))
    expect(settingsStore.getState().fmoAddresses[0]?.syncMode).toBe('today')
    await user.click(screen.getByRole('button', { name: /同步模式：仅当天/ }))
    expect(settingsStore.getState().fmoAddresses[0]?.syncMode).toBe('incremental')
    await user.click(screen.getByRole('button', { name: /同步模式：增量/ }))
    expect(settingsStore.getState().fmoAddresses[0]?.syncMode).toBe('all')
  })

  it('Dialog 可选择"增量同步"', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    await user.click(screen.getByRole('button', { name: /添加地址/ }))
    await user.type(await screen.findByPlaceholderText('fmo.local'), 'fmo.local')
    await user.click(screen.getByRole('radio', { name: /增量同步/ }))
    await user.click(screen.getByRole('button', { name: '添加' }))
    expect(settingsStore.getState().fmoAddresses[0]?.syncMode).toBe('incremental')
  })
})
