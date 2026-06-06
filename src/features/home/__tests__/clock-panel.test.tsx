import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClockPanel } from '../components/clock-panel'
import { formatLocalTime, formatUtcTime } from '@/lib/utils/clock'

describe('ClockPanel 时间格式化', () => {
  it('formatUtcTime 按 UTC 输出 HH:MM:SS（补零）', () => {
    const d = new Date(Date.UTC(2026, 5, 7, 4, 5, 9))
    expect(formatUtcTime(d)).toBe('04:05:09')
  })

  it('formatLocalTime 按本地时区输出 HH:MM:SS（补零）', () => {
    const d = new Date(2026, 5, 7, 9, 8, 7)
    expect(formatLocalTime(d)).toBe('09:08:07')
  })
})

describe('ClockPanel 渲染', () => {
  it('渲染 UTC 与本地两组时间', () => {
    render(<ClockPanel />)
    const panel = screen.getByTestId('clock-panel')
    expect(panel).toHaveTextContent('UTC')
    expect(panel).toHaveTextContent('本地')
    expect(panel.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
})
