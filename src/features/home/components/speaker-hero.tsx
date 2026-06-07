import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GridLocation } from '@/components/shared/grid-location'
import { AudioControl } from '@/features/audio/components/audio-control'
import { StationSwitcher } from '@/features/station/components/station-switcher'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { settingsStore } from '@/stores/settings'
import { isFromSelf, selfStore } from '@/stores/self'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { gridToLatLng, haversineKm, bearingDeg, cardinal8 } from '@/lib/utils/grid'
import { cn } from '@/lib/utils'

function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${s % 60}s`
  return `${Math.floor(m / 60)}h${m % 60}m`
}

function formatTimeAgo(unixSeconds: number, nowMs: number, agoSuffix: string): string {
  const delta = Math.floor(nowMs / 1000) - unixSeconds
  if (delta < 60) return `${delta}s${agoSuffix}`
  const m = Math.floor(delta / 60)
  if (m < 60) return `${m}m${agoSuffix}`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h${agoSuffix}`
  return `${Math.floor(h / 24)}d${agoSuffix}`
}

export function SpeakerHero() {
  const { t } = useTranslation()
  const current = speakingStore((s) => s.current)
  const lastSpeaker = speakingStore((s) => s.lastSpeaker)
  const logs = logsStore((s) => s.all)
  const local = logsStore((s) => s.local)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const myCoord = selfStore((s) => s.coordinate)
  const selfCallsign = selfStore((s) => s.callsign)

  const speaker = current ?? lastSpeaker
  const mode: 'live' | 'standby' | 'empty' = current ? 'live' : lastSpeaker ? 'standby' : 'empty'

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [current, lastSpeaker])

  // 本机判定：服务器返回的呼号（连接后自动获取）优先，设置页手动呼号兜底
  const isSelf =
    speaker !== null &&
    (isFromSelf(speaker.callsign, selfCallsign) || isSameOperator(speaker.callsign, myCallsign))

  const stats = (() => {
    if (!speaker) return null
    const target = speaker.callsign
    const serverMatches = logs.filter((l) => l.toCallsign === target)
    const localMatches = local.filter((l) => l.toCallsign === target)
    const count = serverMatches.length + localMatches.length
    if (count === 0) return { count: 0, lastTime: null as number | null }
    let lastTime = 0
    for (const m of serverMatches) if (m.timestamp > lastTime) lastTime = m.timestamp
    for (const m of localMatches) if (m.timestamp > lastTime) lastTime = m.timestamp
    return { count, lastTime }
  })()

  // 距离 + 方位（文字）。仅当有我方坐标、对方网格可解析、非本机。
  const theirCoord = mode !== 'empty' && speaker ? gridToLatLng(speaker.grid) : null
  const distanceText =
    mode !== 'empty' && !isSelf && myCoord && theirCoord
      ? (() => {
          const km = haversineKm(myCoord, theirCoord)
          const dist = km < 1 ? t('home.compass.distanceLt1') : `${Math.round(km)} km`
          return `${dist} · ${t(`home.compass.${cardinal8(bearingDeg(myCoord, theirCoord))}`)}`
        })()
      : null

  return (
    <section
      data-testid="speaker-hero"
      data-mode={mode}
      aria-label={t('speaking.barAria')}
      className={cn(
        'hud-frame hud-overlay flex shrink-0 flex-col gap-2 p-3 tall:gap-3 tall:p-5',
        mode === 'live' && 'hud-breathe'
      )}
    >
      {/* 群组行：当前群组名 + 切换（未连接时 StationSwitcher 自隐藏） */}
      <div className="-mx-2 -mt-1 flex items-center border-b border-border/40 pb-1">
        <StationSwitcher />
      </div>

      {mode === 'empty' ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-1 tall:gap-2 tall:py-4">
          <span className="h-3 w-3 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span className="hud-title text-2xl text-muted-foreground tall:text-4xl">
            {t('home.standby')}
          </span>
          <span className="hud-mono text-xs text-muted-foreground">{t('home.standbyHint')}</span>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                'h-3 w-3 rounded-full',
                mode === 'live' ? 'animate-pulse bg-primary' : 'bg-muted-foreground'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'hud-title min-w-0 break-all text-3xl leading-none tall:text-5xl',
                mode === 'live'
                  ? 'text-primary [text-shadow:0_0_18px_var(--primary)]'
                  : 'text-muted-foreground'
              )}
            >
              {speaker!.callsign}
            </span>
            {mode === 'live' && speaker!.isHost && (
              <span className="hud-mono rounded-sm border border-accent bg-accent/10 px-2 py-0.5 text-xs text-accent">
                HOST
              </span>
            )}
            {mode === 'live' && isSelf && (
              <span className="hud-mono rounded-sm border border-primary bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {t('speaking.self')}
              </span>
            )}
            {mode === 'live' && !isSelf && stats?.count === 1 && (
              <span
                className={cn(
                  'hud-mono rounded-sm border px-2 py-0.5 text-xs',
                  'border-[oklch(0.76_0.19_142)] bg-[oklch(0.76_0.19_142)]/15 text-[oklch(0.76_0.19_142)]'
                )}
                title={t('speaking.newBadgeTitle')}
              >
                ✦ {t('speaking.newBadge')}
              </span>
            )}
            {mode === 'standby' && (
              <span className="hud-mono rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {t('home.standbyTag')}
              </span>
            )}
            <div className="flex-1" />
            {mode === 'live' && (
              <span className="hud-mono text-base text-accent">
                {formatElapsed(Math.max(0, nowMs - speaker!.startedAtMs))}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {speaker!.grid && (
              <span className="hud-mono text-base">
                <GridLocation grid={speaker!.grid} emphasized />
              </span>
            )}
            {distanceText && <span className="hud-mono text-sm text-primary">{distanceText}</span>}
            {mode === 'standby' && (
              <span className="hud-mono text-xs text-muted-foreground">
                {t('home.lastHeard', {
                  ago: formatTimeAgo(
                    Math.floor(speaker!.startedAtMs / 1000),
                    nowMs,
                    t('speaking.agoSuffix')
                  )
                })}
              </span>
            )}
            {mode === 'live' &&
              !isSelf &&
              (stats && stats.count > 0 ? (
                <span className="hud-mono text-sm">
                  <span className="text-muted-foreground">{t('speaking.workedPrefix')}</span>
                  <span className="text-primary">{stats.count}</span>
                  <span className="text-muted-foreground">{t('speaking.workedSuffix')}</span>
                  {stats.lastTime !== null && (
                    <>
                      <span className="text-muted-foreground">{t('speaking.lastPrefix')}</span>
                      <span className="text-primary">
                        {formatTimeAgo(stats.lastTime, nowMs, t('speaking.agoSuffix'))}
                      </span>
                    </>
                  )}
                </span>
              ) : (
                <span className="hud-mono text-sm text-muted-foreground">
                  {t('speaking.notWorked')}
                </span>
              ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SpectrumWaveform height={24} />
        </div>
        <AudioControl />
      </div>
    </section>
  )
}
