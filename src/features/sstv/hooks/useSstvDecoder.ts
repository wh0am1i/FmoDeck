// src/features/sstv/hooks/useSstvDecoder.ts
import { useEffect, useRef } from 'react'
import { SstvDecoder } from '@/lib/sstv/decoder'
import { PcmTap } from '@/lib/sstv/pcm-tap'
import { engineRefStore } from '@/features/audio/engine-store'
import { sstvStore } from '../store'
import { sstvRepo } from '@/lib/db/sstv-repo'
import type { Mode } from '@/lib/sstv/modes/types'

export interface UseSstvDecoderOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}

/**
 * 驱动 SstvDecoder:
 * - mount 时轮询 engineRefStore.engine?.getAnalyser(),就绪后挂 tap + rAF
 * - onRow → ctx.putImageData 渐进画 canvas
 * - onDone → canvas.toBlob + 缩略图 → sstvRepo.add
 * - unmount 时 cancelAnimationFrame,decoder.reset,store.reset
 */
export function useSstvDecoder({ canvasRef }: UseSstvDecoderOptions): void {
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

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return false

      const sampleRate = (analyser.context as AudioContext).sampleRate
      tapRef.current = new PcmTap(Math.round(sampleRate * 3))
      decoderRef.current = new SstvDecoder(sampleRate, {
        onStart: (mode) => {
          if (!canvasRef.current) return
          resizeCanvas(canvasRef.current, mode)
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, mode.width, mode.height)
          sstvStore.getState().setStatus('decoding')
          sstvStore.getState().setActiveMode(mode.name)
          sstvStore.getState().setProgress(0)
        },
        onRow: (row, rgba, mode) => {
          const imgData = new ImageData(rgba, mode.width, 1)
          ctx.putImageData(imgData, 0, row)
          sstvStore.getState().setProgress((row + 1) / mode.height)
        },
        onDone: async ({ mode }) => {
          sstvStore.getState().setStatus('done')
          sstvStore.getState().setProgress(1)
          try {
            const canvas = canvasRef.current
            if (!canvas) return
            const { imageBlob, thumbnailBlob } = await canvasToBlobs(canvas, mode)
            await sstvRepo.add({
              mode: mode.name,
              width: mode.width,
              height: mode.height,
              imageBlob,
              thumbnailBlob
            })
          } catch (err) {
            sstvStore.getState().setError(err instanceof Error ? err.message : String(err))
          }
          setTimeout(() => {
            if (!stopped) {
              sstvStore.getState().setStatus('idle')
              sstvStore.getState().setActiveMode(null)
              sstvStore.getState().setProgress(0)
            }
          }, 2000)
        },
        onTimeout: () => {
          sstvStore.getState().setStatus('timeout')
          setTimeout(() => {
            if (!stopped) {
              sstvStore.getState().setStatus('idle')
              sstvStore.getState().setActiveMode(null)
              sstvStore.getState().setProgress(0)
            }
          }, 1500)
        }
      })

      sstvStore.getState().setStatus('waiting')

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
      sstvStore.getState().reset()
    }
  }, [canvasRef])
}

function resizeCanvas(canvas: HTMLCanvasElement, mode: Mode) {
  canvas.width = mode.width
  canvas.height = mode.height
}

async function canvasToBlobs(
  canvas: HTMLCanvasElement,
  mode: Mode
): Promise<{ imageBlob: Blob; thumbnailBlob: Blob }> {
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/png')
  })

  const thumbW = 80
  const thumbH = Math.round((80 * mode.height) / mode.width)
  const off = document.createElement('canvas')
  off.width = thumbW
  off.height = thumbH
  const octx = off.getContext('2d')
  if (!octx) {
    return { imageBlob, thumbnailBlob: imageBlob }
  }
  octx.imageSmoothingEnabled = true
  octx.drawImage(canvas, 0, 0, thumbW, thumbH)
  const thumbnailBlob = await new Promise<Blob>((resolve) => {
    off.toBlob((b) => resolve(b ?? imageBlob), 'image/png')
  })
  return { imageBlob, thumbnailBlob }
}
