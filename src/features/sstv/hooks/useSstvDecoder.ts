// src/features/sstv/hooks/useSstvDecoder.ts
import { useEffect, useRef } from 'react'
import { SstvDecoder } from '@/lib/sstv/decoder'
import { PcmTap } from '@/lib/sstv/pcm-tap'
import { engineRefStore } from '@/features/audio/engine-store'
import { AUDIO_SOURCE_SAMPLE_RATE } from '@/lib/audio/engine'
import { LivePcmPump } from '@/lib/sstv/live-pcm-pump'
import { sstvStore } from '../store'
import { sstvRepo } from '@/lib/db/sstv-repo'
import { settingsStore } from '@/stores/settings'
import { notify, notificationsSupported } from '@/lib/notifications'
import { toast } from 'sonner'
import type { Mode } from '@/lib/sstv/modes/types'

/**
 * SSTV 解码 session。无参数;优先驱动 raw PCM → LivePcmPump → SstvDecoder，
 * fallback 时才走 raw analyser → PcmTap → SstvDecoder →
 * sstvStore + IDB。
 *
 * 说明:
 * - FMO 下行原始流本身就是 8kHz PCM；直接订阅它可以避开 AudioContext 调度带来的
 *   时间空洞。Robot72 这类快模式对这类空洞最敏感。
 * - 只有在没有原始 PCM 订阅能力时，才退回 raw analyser 路径。
 *
 * 完成时:
 *  - toast 提示(应用内)
 *  - 如果 settings.notificationsEnabled 则 desktop Notification
 *
 * 调用方负责控制 mount/unmount 生命周期(见 <SstvSessionRunner />)。
 */
export function useSstvDecoder(): void {
  const decoderRef = useRef<SstvDecoder | null>(null)
  const tapRef = useRef<PcmTap | null>(null)

  useEffect(() => {
    let stopped = false
    let attachInterval: ReturnType<typeof setInterval> | null = null
    let pumpInterval: ReturnType<typeof setInterval> | null = null
    let unsubscribeRawPcm: (() => void) | null = null

    const stopAttachLoop = () => {
      if (!attachInterval) return
      clearInterval(attachInterval)
      attachInterval = null
    }

    const stopPump = () => {
      if (!pumpInterval) return
      clearInterval(pumpInterval)
      pumpInterval = null
    }

    const stopRawPcm = () => {
      if (!unsubscribeRawPcm) return
      unsubscribeRawPcm()
      unsubscribeRawPcm = null
    }

    const detach = () => {
      stopPump()
      stopRawPcm()
      decoderRef.current?.reset()
      decoderRef.current = null
      tapRef.current = null
      sstvStore.getState().setIdle()
    }

    const createDecoder = (sampleRate: number): SstvDecoder =>
      new SstvDecoder(sampleRate, {
        onStart: (mode) => {
          sstvStore.getState().onDecoderStart(mode)
        },
        onRow: (row, rgba, mode) => {
          sstvStore.getState().onDecoderRow(row, rgba, mode)
        },
        onDone: async ({ mode, rgba }) => {
          sstvStore.getState().onDecoderDone(mode)
          try {
            const { imageBlob, thumbnailBlob } = await rgbaToBlobs(rgba, mode)
            await sstvRepo.add({
              mode: mode.name,
              width: mode.width,
              height: mode.height,
              imageBlob,
              thumbnailBlob
            })
            sstvStore.getState().incrementSavedCount()
            toast.success(`SSTV 接收完成:${mode.displayName}`, {
              description: '已存入历史'
            })
            const settings = settingsStore.getState()
            if (settings.notificationsEnabled && notificationsSupported()) {
              notify('SSTV 图像已接收', `${mode.displayName}`)
            }
          } catch (err) {
            sstvStore.getState().setError(err instanceof Error ? err.message : String(err))
          }
        },
        onTimeout: () => {
          sstvStore.getState().onDecoderTimeout()
        }
      })

    const tick = (analyser: AnalyserNode) => {
      if (stopped) return
      tapRef.current?.pullFromAnalyser(analyser)
      if (tapRef.current && decoderRef.current) {
        decoderRef.current.tick(tapRef.current)
      }
    }

    const startPump = (analyser: AnalyserNode) => {
      stopPump()
      tick(analyser)
      // 20ms 轮询可稳定覆盖 44.1k/48k 下 raw analyser 的滚动窗口，
      // 同时不依赖 requestAnimationFrame 或页面可见性。
      pumpInterval = setInterval(() => {
        tick(analyser)
      }, 20)
    }

    const attachViaRawPcm = (engine: {
      subscribeRawPcm: (listener: (chunk: Float32Array, sampleRate: number) => void) => () => void
    }): boolean => {
      stopPump()
      stopRawPcm()
      tapRef.current = null
      // 本地变量 pin 住类型,避免 IDE TS Server 偶发把 import 的常量推断成
      // error 类型时 @typescript-eslint/no-unsafe-argument 误报。
      const sampleRate: number = AUDIO_SOURCE_SAMPLE_RATE
      const decoder = createDecoder(sampleRate)
      const pump = new LivePcmPump(sampleRate, decoder)
      decoderRef.current = decoder
      unsubscribeRawPcm = engine.subscribeRawPcm((chunk, sourceSampleRate) => {
        if (stopped) return
        pump.push(chunk, sourceSampleRate)
      })
      sstvStore.getState().setWaiting()
      return true
    }

    const attachTo = (engine = engineRefStore.getState().engine): boolean => {
      if (!engine) return false
      if (typeof engine.subscribeRawPcm === 'function') {
        return attachViaRawPcm(engine)
      }

      const analyser = engine.getRawAnalyser()
      if (!analyser) return false
      const sampleRate = (analyser.context as AudioContext).sampleRate

      stopRawPcm()
      tapRef.current = new PcmTap(Math.round(sampleRate * 3))
      decoderRef.current = createDecoder(sampleRate)
      sstvStore.getState().setWaiting()
      startPump(analyser)
      return true
    }

    const ensureAttachLoop = () => {
      if (attachInterval) return
      attachInterval = setInterval(() => {
        if (attachTo()) {
          stopAttachLoop()
        }
      }, 250)
    }

    const tryAttach = (): boolean => {
      if (pumpInterval && decoderRef.current && tapRef.current) return true
      return attachTo()
    }

    if (!tryAttach()) {
      ensureAttachLoop()
    }

    const unsubEngine = engineRefStore.subscribe((s, prev) => {
      if (s.engine === prev.engine) return
      stopAttachLoop()
      detach()
      if (!attachTo(s.engine)) {
        ensureAttachLoop()
      }
    })

    return () => {
      stopped = true
      unsubEngine()
      stopAttachLoop()
      detach()
    }
  }, [])
}

async function rgbaToBlobs(
  rgba: Uint8ClampedArray,
  mode: Mode
): Promise<{ imageBlob: Blob; thumbnailBlob: Blob }> {
  // rgba → offscreen canvas → png blob
  const canvas = document.createElement('canvas')
  canvas.width = mode.width
  canvas.height = mode.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable')
  const imageData = new ImageData(Uint8ClampedArray.from(rgba), mode.width, mode.height)
  ctx.putImageData(imageData, 0, 0)

  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png')
  })

  const thumbW = 80
  const thumbH = Math.round((80 * mode.height) / mode.width)
  const off = document.createElement('canvas')
  off.width = thumbW
  off.height = thumbH
  const octx = off.getContext('2d')
  if (!octx) return { imageBlob, thumbnailBlob: imageBlob }
  octx.imageSmoothingEnabled = true
  octx.drawImage(canvas, 0, 0, thumbW, thumbH)
  const thumbnailBlob = await new Promise<Blob>((resolve) => {
    off.toBlob((b) => resolve(b ?? imageBlob), 'image/png')
  })
  return { imageBlob, thumbnailBlob }
}
