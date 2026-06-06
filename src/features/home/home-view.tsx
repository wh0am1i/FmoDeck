import { useTranslation } from 'react-i18next'
import { SpeakerHero } from './components/speaker-hero'
import { ClockPanel } from './components/clock-panel'
import { MenuPanel } from './components/menu-panel'
import { QsoFeedPanel } from './components/qso-feed-panel'
import { LocationMap } from './components/location-map'
import { PortraitHint, usePortraitPhone } from './components/portrait-hint'
import { RecentCallsigns } from '@/features/spectrum/components/recent-callsigns'
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

/**
 * 首页 v3：值守监控屏。地图满屏铺底，HUD 浮层叠四角。
 * 设计：docs/superpowers/specs/2026-06-07-dashboard-v3-design.md
 */
export function HomeView() {
  const { t } = useTranslation()
  const current = speakingStore((s) => s.current)
  const lastSpeaker = speakingStore((s) => s.lastSpeaker)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const myCoord = selfStore((s) => s.coordinate)
  const portrait = usePortraitPhone()

  const speaker = current ?? lastSpeaker
  const theirCoord = speaker ? gridToLatLng(speaker.grid) : null
  const isSelf = speaker !== null && isSameOperator(speaker.callsign, myCallsign)
  // 自己：地图只定位到自己单点（无连线 —— 自距离无意义且坐标解析有误差）；
  // 对方：标对方网格 + 我方坐标 + 连线（hero 另显距离文字）。
  const mapTarget = isSelf ? (myCoord ?? theirCoord) : theirCoord
  const mapMe = isSelf ? null : myCoord

  if (portrait) {
    return (
      <div data-testid="home-dashboard" className="relative h-full w-full overflow-hidden">
        <PortraitHint />
      </div>
    )
  }

  return (
    <div data-testid="home-dashboard" className="relative h-full w-full overflow-hidden">
      <LocationMap target={mapTarget} me={mapMe} />

      {/* 左上：讲话者 Hero */}
      <div className="absolute left-3 top-3 z-10 w-[min(420px,40vw)]">
        <SpeakerHero />
      </div>

      {/* 右上：时钟 + 菜单 */}
      <div className="absolute right-3 top-3 z-10 flex items-stretch gap-2">
        <ClockPanel />
        <MenuPanel />
      </div>

      {/* 右侧：QSO 实时流（顶部让开时钟，底部到底） */}
      <div className="absolute bottom-3 right-3 top-32 z-10 w-[min(280px,24vw)]">
        <QsoFeedPanel />
      </div>

      {/* 左下：讲话名册 */}
      <div className="absolute bottom-3 left-3 z-10 w-[min(640px,55vw)]">
        <div className="hud-frame hud-overlay">
          <div className="hud-mono px-3 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {t('home.panelRoster')}
          </div>
          <RecentCallsigns />
        </div>
      </div>
    </div>
  )
}
