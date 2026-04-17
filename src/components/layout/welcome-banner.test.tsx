import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { WelcomeBanner } from './welcome-banner'
import { resetSettingsForTest, settingsStore } from '@/stores/settings'

function renderWithRouter(initialPath = '/logs') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/logs" element={<WelcomeBanner />} />
        <Route path="/settings" element={<div data-testid="settings-page">settings</div>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  resetSettingsForTest()
  localStorage.clear()
})

afterEach(() => {
  resetSettingsForTest()
})

describe('WelcomeBanner', () => {
  it('无地址时显示', () => {
    renderWithRouter()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/欢迎使用 FmoDeck/)).toBeInTheDocument()
  })

  it('有地址时隐藏', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }]
    })
    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('点"去设置"跳到 /settings', async () => {
    const user = userEvent.setup()
    renderWithRouter()
    await user.click(screen.getByRole('button', { name: /去设置/ }))
    expect(screen.getByTestId('settings-page')).toBeInTheDocument()
  })
})
