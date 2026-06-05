import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetSpeakingForTest, speakingStore } from './store'

afterEach(() => {
  resetSpeakingForTest()
})

describe('speaking store', () => {
  it('初始 current=null, history 为空', () => {
    expect(speakingStore.getState().current).toBeNull()
    expect(speakingStore.getState().history).toEqual([])
  })

  it('startSpeaking 设置 current 并记录 startedAtMs', () => {
    const before = Date.now()
    speakingStore.getState().startSpeaking({
      callsign: 'BI3SQP',
      grid: 'OM67gu',
      isHost: false
    })
    const current = speakingStore.getState().current
    expect(current?.callsign).toBe('BI3SQP')
    expect(current?.grid).toBe('OM67gu')
    expect(current?.startedAtMs).toBeGreaterThanOrEqual(before)
  })

  it('stopSpeaking 清空 current', () => {
    speakingStore.getState().startSpeaking({
      callsign: 'X',
      grid: '',
      isHost: false
    })
    speakingStore.getState().stopSpeaking()
    expect(speakingStore.getState().current).toBeNull()
  })

  it('setHistory 覆盖历史', () => {
    speakingStore.getState().setHistory([
      { callsign: 'A', utcTime: 1 },
      { callsign: 'B', utcTime: 2 }
    ])
    expect(speakingStore.getState().history).toHaveLength(2)
  })
})

describe('speakingStore lastSpeaker', () => {
  beforeEach(() => resetSpeakingForTest())

  it('startSpeaking 同时写入 current 与 lastSpeaker', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BG5HXX', grid: 'OM89', isHost: false })
    const s = speakingStore.getState()
    expect(s.current?.callsign).toBe('BG5HXX')
    expect(s.lastSpeaker?.callsign).toBe('BG5HXX')
  })

  it('stopSpeaking 清 current 但保留 lastSpeaker（待机回显用）', () => {
    speakingStore.getState().startSpeaking({ callsign: 'BD4ABC', grid: '', isHost: true })
    speakingStore.getState().stopSpeaking()
    const s = speakingStore.getState()
    expect(s.current).toBeNull()
    expect(s.lastSpeaker?.callsign).toBe('BD4ABC')
    expect(s.lastSpeaker?.isHost).toBe(true)
  })
})
