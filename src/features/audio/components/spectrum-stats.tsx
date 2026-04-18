import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { engineRefStore } from '../engine-store'
import { audioStore } from '../store'

interface Stats {
  rmsDb: number // dBFS，-Infinity ~ 0
  peakFreqHz: number // 当前峰值频率
  peakMag: number // 峰值强度 0~1
}

/**
 * 实时数据条：
 * - RMS dBFS（时域 RMS → 20·log10）
 * - 峰值频率 Hz（频域 argmax bin → freq）
 * - 峰值强度 0~100%
 */
export function SpectrumStats() {
  const { t } = useTranslation()
  const engine = engineRefStore((s) => s.engine)
  const [stats, setStats] = useState<Stats>({ rmsDb: -Infinity, peakFreqHz: 0, peakMag: 0 })

  useEffect(() => {
    if (!engine) return
    const analyser = engine.getAnalyser()
    if (!analyser) return

    const freqData = new Uint8Array(analyser.frequencyBinCount)
    const timeData = new Uint8Array(analyser.fftSize)
    const sampleRate = analyser.context.sampleRate
    const binHz = sampleRate / analyser.fftSize

    let raf = 0
    let stopped = false
    let smoothedRms = -80
    let smoothedFreq = 0
    let smoothedMag = 0
    let lastUpdateAt = 0

    const tick = () => {
      if (stopped) return
      raf = requestAnimationFrame(tick)
      if (document.visibilityState === 'hidden') return
      const now = performance.now()
      // UI 太频繁更新字符不易读；10Hz 刷新足够
      if (now - lastUpdateAt < 100) return
      lastUpdateAt = now

      analyser.getByteTimeDomainData(timeData)
      let sumSq = 0
      for (const sample of timeData) {
        const v = (sample - 128) / 128
        sumSq += v * v
      }
      const rms = Math.sqrt(sumSq / timeData.length) || 1e-9
      const db = 20 * Math.log10(rms)

      analyser.getByteFrequencyData(freqData)
      let maxV = 0
      let maxI = 0
      for (let i = 0; i < freqData.length; i++) {
        const v = freqData[i] ?? 0
        if (v > maxV) {
          maxV = v
          maxI = i
        }
      }
      const freqHz = maxI * binHz
      const mag = maxV / 255

      // 轻度平滑
      smoothedRms = smoothedRms + (db - smoothedRms) * 0.3
      smoothedFreq = smoothedFreq + (freqHz - smoothedFreq) * 0.25
      smoothedMag = smoothedMag + (mag - smoothedMag) * 0.25

      setStats({
        rmsDb: smoothedRms,
        peakFreqHz: smoothedFreq,
        peakMag: smoothedMag
      })
    }

    tick()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [engine])

  const muted = audioStore((s) => s.muted)
  const status = audioStore((s) => s.status)
  const idle = muted || status !== 'playing'

  const rms = Number.isFinite(stats.rmsDb) ? stats.rmsDb : -Infinity
  const rmsStr = rms === -Infinity ? '-∞' : rms.toFixed(1)
  const freqStr =
    stats.peakFreqHz >= 1000
      ? `${(stats.peakFreqHz / 1000).toFixed(2)}k`
      : Math.round(stats.peakFreqHz).toString()
  const magPct = Math.round(stats.peakMag * 100)

  return (
    <div className="hud-mono flex flex-col gap-3 text-xs">
      <Row label={t('spectrum.statsRms')} value={`${rmsStr} dBFS`} dim={idle} />
      <Row label={t('spectrum.statsPeakFreq')} value={`${freqStr} Hz`} dim={idle} />
      <Row label={t('spectrum.statsPeakMag')}>
        <div className="flex items-center gap-2">
          <span className={idle ? 'text-muted-foreground/50' : 'text-primary tabular-nums'}>
            {magPct}%
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-sm border border-border">
            <div
              className="h-full bg-primary transition-[width] duration-75"
              style={{ width: `${magPct}%`, opacity: idle ? 0.3 : 1 }}
            />
          </div>
        </div>
      </Row>
    </div>
  )
}

function Row({
  label,
  value,
  children,
  dim
}: {
  label: string
  value?: string
  children?: React.ReactNode
  dim?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children ?? (
        <span
          className={dim ? 'text-muted-foreground/50 tabular-nums' : 'text-primary tabular-nums'}
        >
          {value}
        </span>
      )}
    </div>
  )
}
