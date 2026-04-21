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

/** 合成一对 row(2 行 300ms),供完整流测试使用。 */
function synthRobot36Pair(y0: number, cr: number, y1: number, cb: number) {
  return concat(
    // Row 0 (even, Cr)
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(y0), 88),
    synthTone(2300, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(cr), 44),
    // Row 1 (odd, Cb)
    synthTone(1200, 9),
    synthTone(1500, 3),
    synthTone(brightnessToFreq(y1), 88),
    synthTone(1500, 4.5),
    synthTone(1900, 1.5),
    synthTone(brightnessToFreq(cb), 44)
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

  it('解码中途被静音打断时触发 timeout', () => {
    const onTimeout = vi.fn()
    const onDone = vi.fn()
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE, { onTimeout, onDone })
    const tap = new PcmTap(TEST_SAMPLE_RATE * 60)

    tap.write(synthVis(0x88))
    decoder.tick(tap)
    expect(decoder.state.type).toBe('decoding')

    // 先写几行有效 Robot36 数据
    for (let row = 0; row < 10; row++) {
      tap.write(synthRobot36Line(128, 128, row))
      decoder.tick(tap)
    }

    // 之后写入长段静音(零值)模拟信号中断
    const silence = new Float32Array(TEST_SAMPLE_RATE * 2) // 2 秒纯零
    tap.write(silence)
    for (let i = 0; i < 20; i++) decoder.tick(tap)

    expect(onTimeout).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
    expect(decoder.state.type).toBe('idle')
  })

  it('完整 Robot36 流:VIS + 120 对行 → done → 回 idle', { timeout: 30_000 }, () => {
    const onRow = vi.fn()
    const onDone = vi.fn()
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE, { onRow, onDone })

    const tap = new PcmTap(TEST_SAMPLE_RATE * 60)

    // 1) 先写 VIS 并 tick,让 decoder 进入 decoding 状态
    //    (一次性写完再 tick 的话,VIS 会被后续样本挤出 recent(500ms) 窗口)
    tap.write(synthVis(0x88))
    decoder.tick(tap)
    expect(decoder.state.type).toBe('decoding')

    // 2) 逐对写 120 对全灰图(rowsPerScanLine=2,每对 300ms),每写一对 tick 一次
    for (let pair = 0; pair < 120; pair++) {
      tap.write(synthRobot36Pair(128, 128, 128, 128))
      decoder.tick(tap)
    }

    // 3) 可能需要再 tick 几次让剩余缓冲的行落位
    for (let i = 0; i < 10 && decoder.state.type !== 'idle'; i++) {
      decoder.tick(tap)
    }

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onRow).toHaveBeenCalled()
    // rowsPerScanLine=2,每对触发 2 次 onRow,120 对 → 240 次
    expect(onRow.mock.calls.length).toBeGreaterThan(235)
    expect(decoder.state.type).toBe('idle')
  })
})
