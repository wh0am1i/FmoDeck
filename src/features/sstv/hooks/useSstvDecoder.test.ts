import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSstvDecoder } from './useSstvDecoder'
import { engineRefStore } from '@/features/audio/engine-store'
import { sstvStore } from '../store'
import type { AudioEngine } from '@/lib/audio/engine'

function resetSstvStore() {
  sstvStore.setState({
    status: 'idle',
    activeMode: null,
    progress: 0,
    currentRgba: null,
    currentWidth: 0,
    currentHeight: 0,
    lastRow: -1,
    lastDoneAt: null,
    lastError: null,
    recentDecodes: [],
    savedCount: 0
  })
}

function createFakeAnalyser(sampleRate: number): AnalyserNode {
  return {
    fftSize: 2048,
    context: {
      sampleRate,
      currentTime: 0
    },
    getFloatTimeDomainData(target: Float32Array) {
      target.fill(0)
    }
  } as unknown as AnalyserNode
}

describe('useSstvDecoder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    engineRefStore.getState().setEngine(null)
    resetSstvStore()
  })

  afterEach(() => {
    engineRefStore.getState().setEngine(null)
    resetSstvStore()
    vi.useRealTimers()
  })

  it('仅在 rawAnalyser 可用后进入 waiting,并能处理 analyser 晚到', () => {
    let analyserAvailable = false
    const analyser = createFakeAnalyser(44100)
    const engine = {
      getRawAnalyser: () => (analyserAvailable ? analyser : null),
      getContextSampleRate: () => 44100,
      subscribeRawPcm: undefined
    } as unknown as AudioEngine

    engineRefStore.getState().setEngine(engine)
    renderHook(() => useSstvDecoder())

    expect(sstvStore.getState().status).toBe('idle')

    analyserAvailable = true
    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(sstvStore.getState().status).toBe('waiting')
  })

  it('原始 PCM 订阅可用时不再依赖 rawAnalyser 也能进入 waiting', () => {
    const unsubscribe = vi.fn(() => undefined)
    const engine = {
      getRawAnalyser: () => null,
      getContextSampleRate: () => null,
      subscribeRawPcm: vi.fn(() => unsubscribe)
    } as unknown as AudioEngine

    engineRefStore.getState().setEngine(engine)
    renderHook(() => useSstvDecoder())

    expect(sstvStore.getState().status).toBe('waiting')
  })
})
