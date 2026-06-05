import { useTranslation } from 'react-i18next'
import { SpeakerHero } from './components/speaker-hero'
import { DashboardPanel } from './components/dashboard-panel'
import { LocationMap } from './components/location-map'
import { RecentCallsigns } from '@/features/spectrum/components/recent-callsigns'
import { SpectrumWaveform } from '@/features/audio/components/spectrum-waveform'
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
      <div className="hud-frame px-4 py-2">
        <SpectrumWaveform height={32} />
      </div>

      <SpeakerHero />

      <DashboardPanel title={t('home.panelMap')}>
        {mapTarget ? (
          <LocationMap their={mapTarget} me={mapMe} />
        ) : (
          <div className="flex h-[300px] items-center justify-center sm:h-[400px] lg:h-[480px]">
            <span className="hud-mono text-xs text-muted-foreground">{t('home.mapNoTarget')}</span>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title={t('home.panelRoster')}>
        <RecentCallsigns />
      </DashboardPanel>
    </div>
  )
}
