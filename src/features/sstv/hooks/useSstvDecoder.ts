// src/features/sstv/hooks/useSstvDecoder.ts
import { useEffect, useRef } from 'react'
import { SstvDecoder } from '@/lib/sstv/decoder'
import { PcmTap } from '@/lib/sstv/pcm-tap'
import { engineRefStore } from '@/features/audio/engine-store'
import { sstvStore } from '../store'
import { sstvRepo } from '@/lib/db/sstv-repo'
import { settingsStore } from '@/stores/settings'
import { notify, notificationsSupported } from '@/lib/notifications'
import { toast } from 'sonner'
import type { Mode } from '@/lib/sstv/modes/types'

/**
 * SSTV 解码 session。无参数;驱动 analyser → PcmTap → SstvDecoder → sstvStore + IDB。
 *
 * 完成时:
 *  - toast 提示(应用内)
 *  - 如果 settings.notificationsEnabled 则 desktop Notification
 *  - sstvStore.unreadCount++
 *
 * 调用方负责控制 mount/unmount 生命周期(见 <SstvSessionRunner />)。
 */
export function useSstvDecoder(): void {
  const decoderRef = useRef<SstvDecoder | null>(null)
  const tapRef = useRef<PcmTap | null>(null)

  useEffect(() => {
    let raf = 0
    let stopped = false
    let attachInterval: ReturnType<typeof setInterval> | null = null

    const tryAttach = (): boolean => {
      const engine = engineRefStore.getState().engine
      const analyser = engine?.getAnalyser()
      if (!analyser || !engine) return false

      const sampleRate = (analyser.context as AudioContext).sampleRate
      tapRef.current = new PcmTap(Math.round(sampleRate * 3))
      decoderRef.current = new SstvDecoder(sampleRate, {
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
            sstvStore.getState().incrementUnread()
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

      sstvStore.getState().setWaiting()

      const loop = () => {
        if (stopped) return
        raf = requestAnimationFrame(loop)
        if (document.visibilityState === 'hidden') return
        tapRef.current?.pullFromAnalyser(analyser)
        if (tapRef.current && decoderRef.current) {
          decoderRef.current.tick(tapRef.current)
        }
      }
      loop()
      return true
    }

    if (!tryAttach()) {
      attachInterval = setInterval(() => {
        if (tryAttach() && attachInterval) {
          clearInterval(attachInterval)
          attachInterval = null
        }
      }, 250)
    }

    return () => {
      stopped = true
      if (attachInterval) clearInterval(attachInterval)
      cancelAnimationFrame(raf)
      decoderRef.current?.reset()
      decoderRef.current = null
      tapRef.current = null
      sstvStore.getState().setIdle()
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
  const imageData = new ImageData(rgba, mode.width, mode.height)
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
