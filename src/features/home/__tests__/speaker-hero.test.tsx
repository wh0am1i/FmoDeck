import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SpeakerHero } from '../components/speaker-hero'
import { speakingStore, resetSpeakingForTest } from '@/features/speaking/store'
import { resetLogsForTest } from '@/features/logs/store'
import { selfStore, resetSelfForTest } from '@/stores/self'

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

describe('SpeakerHero 罗盘', () => {
  beforeEach(() => {
    resetSpeakingForTest()
    resetLogsForTest()
    resetSelfForTest()
  })

  it('有我方坐标 + 对方网格 + 非本机 → 显示罗盘', () => {
    selfStore.getState().setCoordinate({ lat: 31, lng: 121 })
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(<SpeakerHero />)
    expect(screen.getByTestId('direction-compass')).toBeInTheDocument()
  })

  it('缺我方坐标但对方有网格 → 显示设备坐标未知提示，无罗盘', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    render(<SpeakerHero />)
    expect(screen.queryByTestId('direction-compass')).not.toBeInTheDocument()
    expect(screen.getByText('设备坐标未知')).toBeInTheDocument()
  })

  it('对方无网格 → 既无罗盘也无提示', () => {
    selfStore.getState().setCoordinate({ lat: 31, lng: 121 })
    speakingStore.getState().startSpeaking({ callsign: 'BD4ABC', grid: '', isHost: false })
    render(<SpeakerHero />)
    expect(screen.queryByTestId('direction-compass')).not.toBeInTheDocument()
    expect(screen.queryByText('设备坐标未知')).not.toBeInTheDocument()
  })
})
