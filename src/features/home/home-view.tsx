import { useTranslation } from 'react-i18next'
import { SpeakerHero } from './components/speaker-hero'
import { TodayStats } from './components/today-stats'
import { DashboardPanel } from './components/dashboard-panel'
import { LocationMap } from './components/location-map'
import { StationSwitcher } from '@/features/station/components/station-switcher'
import { RecentCallsigns } from '@/features/spectrum/components/recent-callsigns'
import { SpectrumVisualizer } from '@/features/audio/components/spectrum-visualizer'
import { speakingStore } from '@/features/speaking/store'
import { selfStore } from '@/stores/self'
import { settingsStore } from '@/stores/settings'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { gridToLatLng } from '@/lib/utils/grid'

function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

export function HomeView() {
  const { t } = useTranslation()
  const current = speakingStore((s) => s.current)
  const lastSpeaker = speakingStore((s) => s.lastSpeaker)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const myCoord = selfStore((s) => s.coordinate)

  const speaker = current ?? lastSpeaker
  const theirCoord = speaker ? gridToLatLng(speaker.grid) : null
  const isSelf = speaker !== null && isSameOperator(speaker.callsign, myCallsign)
  // 自己：地图只定位到自己单点（无连线、无距离 —— 自距离无意义且坐标解析有误差）；
  // 对方：标对方网格 + 我方坐标 + 连线（hero 另显距离文字）。
  const mapTarget = isSelf ? (myCoord ?? theirCoord) : theirCoord
  const mapMe = isSelf ? null : myCoord

  return (
    <div className="flex flex-col gap-4">
      <div className="hud-frame flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <StationSwitcher />
        <TodayStats />
      </div>

      <SpeakerHero />

      <DashboardPanel title={t('home.panelMap')}>
        {mapTarget ? (
          <LocationMap their={mapTarget} me={mapMe} />
        ) : (
          <div className="flex h-[480px] items-center justify-center">
            <span className="hud-mono text-xs text-muted-foreground">{t('home.mapNoTarget')}</span>
          </div>
        )}
      </DashboardPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardPanel title={t('home.panelRoster')}>
          <RecentCallsigns />
        </DashboardPanel>
        <DashboardPanel title={t('home.panelSpectrum')}>
          <div className="p-3">
            <SpectrumVisualizer
              height={160}
              bars={28}
              gap={4}
              smoothing={0.25}
              mirror
              peakHold
              grid
            />
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}
