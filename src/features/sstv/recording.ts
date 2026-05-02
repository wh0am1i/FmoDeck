// src/features/sstv/recording.ts
import { create } from 'zustand'
import type { SstvMode } from '@/types/sstv'

/**
 * 调试辅助:抓取「下一帧」对应的原始 PCM,导出为 WAV 供离线分析。
 * 本模块为纯客户端,不入 IDB,刷新页面即丢失。
 *
 * 流程:
 *  - arm():进入 armed,持续把最近 PRE_BUFFER_SECONDS 的输入塞进环形 pre-buffer。
 *  - decoder onStart 时,使用方调 markCaptureStart(),pre-buffer 整体接到正式
 *    chunks 前,状态切到 recording。
 *  - decoder onDone / onTimeout 时,使用方调 finalize(mode):合并所有 chunk → 编 WAV。
 *  - cancel() 任何阶段都可中断。
 */

type RecorderState = 'idle' | 'armed' | 'recording'

interface Clip {
  blob: Blob
  url: string
  sampleRate: number
  durationSec: number
  mode: SstvMode | null
  capturedAt: number
}

interface RecordingStore {
  state: RecorderState
  lastClip: Clip | null
  arm: () => void
  cancel: () => void
  clearClip: () => void
}

const PRE_BUFFER_SECONDS = 2

let chunks: Float32Array[] = []
let preBuffer: Float32Array[] = []
let preBufferSamples = 0
let sampleRate = 0

function resetBuffers(): void {
  chunks = []
  preBuffer = []
  preBufferSamples = 0
  sampleRate = 0
}

export const recordingStore = /* @__PURE__ */ create<RecordingStore>((set, get) => ({
  state: 'idle',
  lastClip: null,
  arm: () => {
    if (get().state !== 'idle') return
    resetBuffers()
    const old = get().lastClip
    if (old) URL.revokeObjectURL(old.url)
    set({ state: 'armed', lastClip: null })
  },
  cancel: () => {
    resetBuffers()
    set({ state: 'idle' })
  },
  clearClip: () => {
    const c = get().lastClip
    if (c) URL.revokeObjectURL(c.url)
    set({ lastClip: null })
  }
}))

/** 由 useSstvDecoder 在每个 PCM chunk 到来时调用。 */
export function recorderFeed(chunk: Float32Array, chunkSampleRate: number): void {
  const s = recordingStore.getState().state
  if (s === 'idle') return
  if (sampleRate === 0) sampleRate = chunkSampleRate
  if (chunkSampleRate !== sampleRate) return
  const copy = new Float32Array(chunk)
  if (s === 'armed') {
    preBuffer.push(copy)
    preBufferSamples += copy.length
    const target = PRE_BUFFER_SECONDS * sampleRate
    // 保留最新 PRE_BUFFER_SECONDS 秒,丢弃更老的
    while (preBuffer.length > 1 && preBufferSamples - preBuffer[0]!.length > target) {
      preBufferSamples -= preBuffer.shift()!.length
    }
  } else {
    chunks.push(copy)
  }
}

/** 由 useSstvDecoder 在 onStart(VIS 检测到)时调用,把 pre-buffer 转入正式 chunks。 */
export function recorderMarkCaptureStart(): void {
  if (recordingStore.getState().state !== 'armed') return
  chunks = preBuffer.slice()
  preBuffer = []
  preBufferSamples = 0
  recordingStore.setState({ state: 'recording' })
}

/** 由 useSstvDecoder 在 onDone / onTimeout 时调用,生成 WAV 并存到 store。 */
export function recorderFinalize(mode: SstvMode | null): void {
  if (recordingStore.getState().state !== 'recording') return
  if (chunks.length === 0 || sampleRate === 0) {
    resetBuffers()
    recordingStore.setState({ state: 'idle' })
    return
  }
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const merged = new Float32Array(total)
  let off = 0
  for (const c of chunks) {
    merged.set(c, off)
    off += c.length
  }
  const sr = sampleRate
  const blob = encodeWavInt16(merged, sr)
  const url = URL.createObjectURL(blob)
  const clip: Clip = {
    blob,
    url,
    sampleRate: sr,
    durationSec: total / sr,
    mode,
    capturedAt: Date.now()
  }
  const old = recordingStore.getState().lastClip
  if (old) URL.revokeObjectURL(old.url)
  resetBuffers()
  recordingStore.setState({ state: 'idle', lastClip: clip })
}

function encodeWavInt16(samples: Float32Array, sr: number): Blob {
  const numSamples = samples.length
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sr * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = numSamples * (bitsPerSample / 8)
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  // RIFF header
  view.setUint32(0, 0x52494646, false) // "RIFF"
  view.setUint32(4, 36 + dataSize, true)
  view.setUint32(8, 0x57415645, false) // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false) // "fmt "
  view.setUint32(16, 16, true) // PCM fmt size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  // data chunk
  view.setUint32(36, 0x64617461, false) // "data"
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
