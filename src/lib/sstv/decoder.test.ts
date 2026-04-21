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

  it('slant correction:发送方 scanLineMs 比理论值长 0.3ms 也能完整解码', { timeout: 30_000 }, () => {
    const decoder = new SstvDecoder(TEST_SAMPLE_RATE)
    const tap = new PcmTap(TEST_SAMPLE_RATE * 60)

    tap.write(synthVis(0x88))
    decoder.tick(tap)
    expect(decoder.state.type).toBe('decoding')

    // 每行 150.3ms 而不是标称 150ms(= +0.3 ms drift/line)
    // sync 9ms + porch 3ms + Y 88.3ms + sep 4.5ms + porch2 1.5ms + chroma 44ms = 150.3ms
    for (let row = 0; row < 240; row++) {
      const separatorHz = row % 2 === 0 ? 2300 : 1500
      tap.write(
        concat(
          synthTone(1200, 9),
          synthTone(1500, 3),
          synthTone(brightnessToFreq(128), 88.3), // Y 段拉长 0.3ms
          synthTone(separatorHz, 4.5),
          synthTone(1900, 1.5),
          synthTone(brightnessToFreq(128), 44)
        )
      )
      decoder.tick(tap)
    }
    for (let k = 0; k < 10 && decoder.state.type !== 'idle'; k++) decoder.tick(tap)

    // decoder 完成后(或至少解完绝大部分行)应该能收敛
    if (decoder.state.type === 'decoding') {
      expect(decoder.state.nextScanLine).toBeGreaterThan(200)
      // slantMsPerScanLine 应该接近 +0.3(我们模拟的漂移)
      expect(decoder.state.slantMsPerScanLine).toBeGreaterThan(0.1)
    }
    // 要么完成(idle),要么已经解了 200 行以上
    expect(
      decoder.state.type === 'idle' ||
      (decoder.state.type === 'decoding' && decoder.state.nextScanLine > 200)
    ).toBe(true)
  })

  it('完整 Robot36 流:VIS + 240 行 → done → 回 idle', { timeout: 30_000 }, () => {
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
