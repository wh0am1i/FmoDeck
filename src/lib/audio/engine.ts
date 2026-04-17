/**
 * FMO 音频下行引擎（纯浏览器原生实现）。
 *
 * 链路：
 *   ws(binary) → PCM16 LE (8kHz, mono) → Float32 → AudioBufferSourceNode
 *              → HPF → LPF → EQ×3 → Compressor → Gain → destination
 *
 * - 只听不说。没有 mic 采集、没有上行。
 * - 不依赖 fmo-mobile-controller 的任何 API；直接连 `ws://host/audio`。
 * - AudioContext 默认挂起，必须由用户手势（按按钮）调 `start()` 解锁。
 * - 调度策略：维护 nextStartTime，每个新 chunk 从 max(now, nextStartTime) 起播。
 *   缓冲过深（> MAX_BUFFER_SEC）丢最老 chunk；落后（nextStartTime < now）
 *   重置到 now + MIN_START_BUFFER_SEC。
 */

const SOURCE_SAMPLE_RATE = 8000
const MIN_START_BUFFER_SEC = 0.1
const LOW_BUFFER_SEC = 0.3
const TARGET_LEAD_SEC = 0.5
const MAX_BUFFER_SEC = 1.0

export type AudioEngineStatus =
  | 'idle'
  | 'connecting'
  | 'playing'
  | 'error'
  | 'closed'

export interface AudioEngineEvents {
  onStatus?: (status: AudioEngineStatus, err?: Error) => void
  /** 每收到一包 PCM 触发一次，便于 UI 画 peak / visualizer（可选）。 */
  onChunk?: (bytes: number) => void
}

export class AudioEngine {
  private ws: WebSocket | null = null
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private chainHead: AudioNode | null = null

  private nextStartTime = 0
  private status: AudioEngineStatus = 'idle'
  private shouldReconnect = false
  private reconnectAttempts = 0
  /** 当前用户音量（0~2），muted=true 时 gain 被强制 0 但此值保留。 */
  private userVolume = 1.0
  /** 抑制标志：用户手动静音 OR 自己正在讲话（过滤自语回声）。
   *  为 true 时丢弃 incoming PCM，gain 置 0；为 false 时恢复正常。 */
  private suppressed = false

  constructor(
    private readonly url: string,
    private readonly events: AudioEngineEvents = {}
  ) {}

  /** 必须由用户手势调用（浏览器 AudioContext 解锁要求）。 */
  async start(): Promise<void> {
    if (this.status === 'connecting' || this.status === 'playing') return

    this.shouldReconnect = true
    this.reconnectAttempts = 0
    await this.ensureContext()
    this.connect()
  }

  stop(): void {
    this.shouldReconnect = false
    this.setStatus('closed')
    this.ws?.close()
    this.ws = null
    // 保留 AudioContext 以便下次快速恢复
    this.nextStartTime = 0
  }

  setVolume(v: number): void {
    this.userVolume = Math.max(0, Math.min(2, v))
    this.applyGain()
  }

  /**
   * 静音 / 抑制。统一入口：
   * - 用户手动静音
   * - 自己正在讲话时过滤（避免自语回声）
   *
   * 实现上做两件事：
   * 1. 后续 incoming PCM 直接丢弃（避免在 ctx 暂停期间堆满调度队列，
   *    恢复时一口气播出来造成时间错位）
   * 2. gain 立即置 0，已调度的残余样本静音播完
   *
   * 不用 ctx.suspend() 是因为已经 start() 的 AudioBufferSourceNode 在
   * suspend 期间不会被丢弃，resume 后会一窝蜂倒出来，反而加剧回声。
   */
  setMuted(m: boolean): void {
    if (this.suppressed === m) return
    this.suppressed = m
    this.applyGain()
    // 状态切换时重置锚点，下一个 packet 重新起播
    this.nextStartTime = 0
  }

  getStatus(): AudioEngineStatus {
    return this.status
  }

  private applyGain(): void {
    if (!this.gain) return
    this.gain.gain.value = this.suppressed ? 0 : this.userVolume
  }

  // -------------------------------------------------------------------
  // 内部
  // -------------------------------------------------------------------

  private async ensureContext(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }

    // 用浏览器原生采样率（通常 44.1kHz / 48kHz）；AudioBuffer 自带 8kHz
    // 标签，节点链会自动重采样，省得我们自己写 resampler。
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioContextCtor({ latencyHint: 'playback' })

    // 处理链（参考 fmo-mobile-controller 的参数，独立实现）
    const hpf = this.ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 800
    hpf.Q.value = 0.7

    const lpf = this.ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 3500
    lpf.Q.value = 0.5

    const eqLow = this.ctx.createBiquadFilter()
    eqLow.type = 'peaking'
    eqLow.frequency.value = 1000
    eqLow.Q.value = 1.0
    eqLow.gain.value = 2.0

    const eqMid = this.ctx.createBiquadFilter()
    eqMid.type = 'peaking'
    eqMid.frequency.value = 1400
    eqMid.Q.value = 0.8
    eqMid.gain.value = 1.0

    const eqHigh = this.ctx.createBiquadFilter()
    eqHigh.type = 'highshelf'
    eqHigh.frequency.value = 2600
    eqHigh.gain.value = 1.0

    const compressor = this.ctx.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 20
    compressor.ratio.value = 4.0
    compressor.attack.value = 0.002
    compressor.release.value = 0.25

    const gain = this.ctx.createGain()
    gain.gain.value = this.suppressed ? 0 : this.userVolume

    hpf.connect(lpf)
    lpf.connect(eqLow)
    eqLow.connect(eqMid)
    eqMid.connect(eqHigh)
    eqHigh.connect(compressor)
    compressor.connect(gain)
    gain.connect(this.ctx.destination)

    this.chainHead = hpf
    this.gain = gain

    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  private connect(): void {
    if (!this.shouldReconnect) return
    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)
      this.ws.binaryType = 'arraybuffer'
    } catch (err) {
      this.setStatus('error', err instanceof Error ? err : new Error(String(err)))
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('playing')
    }

    this.ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        this.events.onChunk?.(ev.data.byteLength)
        this.ingest(ev.data)
      }
    }

    this.ws.onerror = () => {
      // 具体错误由 onclose 统一处理（浏览器 onerror 没有可读细节）
    }

    this.ws.onclose = () => {
      this.ws = null
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      } else {
        this.setStatus('closed')
      }
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return
    const delay = Math.min(500 * 2 ** this.reconnectAttempts, 10_000)
    this.reconnectAttempts++
    setTimeout(() => {
      if (this.shouldReconnect) this.connect()
    }, delay)
  }

  private ingest(buf: ArrayBuffer): void {
    if (!this.ctx || !this.chainHead) return
    // 抑制状态下丢弃 incoming，防止恢复时一口气 flush 出旧声音
    if (this.suppressed) return

    const int16 = new Int16Array(buf)
    if (int16.length === 0) return

    const float = new Float32Array(int16.length)
    // 小端 Int16 → Float32（-1.0 ~ 1.0）
    for (let i = 0; i < int16.length; i++) float[i] = int16[i]! / 32768

    // 告诉浏览器这段样本以 8kHz 采样；接线后节点链会自动重采样到
    // ctx.sampleRate（44.1k/48k），省了手写 resampler。
    const audioBuf = this.ctx.createBuffer(1, float.length, SOURCE_SAMPLE_RATE)
    audioBuf.getChannelData(0).set(float)

    const src = this.ctx.createBufferSource()
    src.buffer = audioBuf
    src.connect(this.chainHead)

    const now = this.ctx.currentTime
    const bufferAhead = this.nextStartTime - now

    let startAt: number
    if (this.nextStartTime < now + 0.01) {
      // 首次启动 / 网络抖动造成落后 → 重新起锚
      startAt = now + MIN_START_BUFFER_SEC
    } else if (bufferAhead > MAX_BUFFER_SEC) {
      // 缓冲过深（网络突然快） → 丢弃旧未播，重新锚到 TARGET_LEAD
      startAt = now + TARGET_LEAD_SEC
    } else if (bufferAhead < LOW_BUFFER_SEC) {
      // 正常但偏低，略延后一点避免继续扁掉
      startAt = Math.max(now + MIN_START_BUFFER_SEC, this.nextStartTime)
    } else {
      startAt = this.nextStartTime
    }

    src.start(startAt)
    this.nextStartTime = startAt + audioBuf.duration
  }

  private setStatus(s: AudioEngineStatus, err?: Error): void {
    if (this.status === s) return
    this.status = s
    this.events.onStatus?.(s, err)
  }
}
