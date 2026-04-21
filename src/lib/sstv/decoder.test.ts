// src/lib/sstv/decoder.test.ts
import { describe, it, expect, vi } from 'vitest'
import { SstvDecoder } from './decoder'
import { PcmTap } from './pcm-tap'
import { synthVis, synthTone, concat, brightnessToFreq, TEST_SAMPLE_RATE } from './__tests__/fixtures'

function synthRobot36Line(y: number, chroma: number, row: number) {
  const separatorHz = row % 2 === 0 ? 2300 : 1500
  return concat(
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(y), 88),
    synthTone(separatorHz, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(chroma), 44)
  )
}

describe('SstvDecoder', () => {
  it('初始状态是 idle', () => {
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE)
    expect(decoder.state.type).toBe('idle')
  })

  it('喂入 Robot36 VIS 后进入 decoding', () => {
    const tap = new PcmTap(TEST_SAMPLE_RATE * 4)
    tap.write(synthVis(0x88))
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE)
    decoder.tick(tap)
    expect(decoder.state.type).toBe('decoding')
    if (decoder.state.type === 'decoding') {
      expect(decoder.state.mode.name).toBe('robot36')
    }
  })

  it('未知 VIS 码静默忽略,保持 idle', () => {
    const tap = new PcmTap(TEST_SAMPLE_RATE * 4)
    tap.write(synthVis(0x01))
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE)
    decoder.tick(tap)
    expect(decoder.state.type).toBe('idle')
  })

  it('完整 Robot36 流:VIS + 240 行 → done → 回 idle', async () => {
    const onRow = vi.fn()
    const onDone = vi.fn()
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE, { onRow, onDone })

    const tap = new PcmTap(TEST_SAMPLE_RATE * 60)

    // 1) 先写 VIS 并 tick,让 decoder 进入 decoding 状态
    //    (一次性写完再 tick 的话,VIS 会被后续样本挤出 recent(500ms) 窗口)
    tap.write(synthVis(0x88))
    decoder.tick(tap)
    expect(decoder.state.type).toBe('decoding')

    // 2) 逐行写 240 行全灰图,每写一行 tick 一次推进解码
    for (let row = 0; row < 240; row++) {
      tap.write(synthRobot36Line(128, 128, row))
      decoder.tick(tap)
    }

    // 3) 可能需要再 tick 几次让剩余缓冲的行落位
    for (let i = 0; i < 10 && decoder.state.type !== 'idle'; i++) {
      decoder.tick(tap)
    }

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onRow).toHaveBeenCalled()
    expect(onRow.mock.calls.length).toBeGreaterThan(235)
    expect(decoder.state.type).toBe('idle')
  })
})
