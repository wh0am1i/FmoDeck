import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SpeakerHero } from '../components/speaker-hero'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'
import { resetLogsForTest } from '@/features/logs/store'

describe('SpeakerHero', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
  })

  it('empty 态：从未有人讲话，显示 STANDBY 占位', () => {
    render(<SpeakerHero />)
    expect(screen.getByTestId('speaker-hero')).toHaveAttribute('data-mode', 'empty')
  })

  it('live 态：有人讲话时显示其呼号且 data-mode=live', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(<SpeakerHero />)
    const hero = screen.getByTestId('speaker-hero')
    expect(hero).toHaveAttribute('data-mode', 'live')
    expect(hero).toHaveTextContent('BG5HXX')
  })

  it('standby 态：停止讲话后回显最近一位且 data-mode=standby', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BD4ABC', grid: '', isHost: false })
    speakingStore.getState().stopSpeaking()
    render(<SpeakerHero />)
    const hero = screen.getByTestId('speaker-hero')
    expect(hero).toHaveAttribute('data-mode', 'standby')
    expect(hero).toHaveTextContent('BD4ABC')
  })
})
