import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { RecentCallsigns } from '../components/recent-callsigns'
import { resetLogsForTest } from '@/features/logs/store'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'

function renderRoster() {
  return render(
    <MemoryRouter>
      <RecentCallsigns />
    </MemoryRouter>
  )
}

describe('RecentCallsigns 去重', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
  })

  it('同一呼号多条历史只渲染一个 chip，带 ×次数，取最近时间', () => {
    const now = Math.floor(Date.now() / 1000)
    speakingStore.getState().setHistory([
      { callsign: 'BG2NBM', utcTime: now - 120 },
      { callsign: 'BG2NBM', utcTime: now - 60 },
      { callsign: 'BG2NBM', utcTime: now - 30 },
      { callsign: 'BG5HXX', utcTime: now - 90 }
    ])
    renderRoster()
    expect(screen.getAllByText('BG2NBM')).toHaveLength(1)
    expect(screen.getByText('×3')).toBeInTheDocument()
    expect(screen.getAllByText('BG5HXX')).toHaveLength(1)
    expect(screen.queryByText('×1')).not.toBeInTheDocument()
  })

  it('去重后按最近讲话时间倒序排列', () => {
    const now = Math.floor(Date.now() / 1000)
    speakingStore.getState().setHistory([
      { callsign: 'BG1AAA', utcTime: now - 300 },
      { callsign: 'BG2BBB', utcTime: now - 10 },
      { callsign: 'BG1AAA', utcTime: now - 5 }
    ])
    renderRoster()
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('BG1AAA')
    expect(buttons[1]).toHaveTextContent('BG2BBB')
  })
})
