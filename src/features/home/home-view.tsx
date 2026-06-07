import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SpeakerHero } from './components/speaker-hero'
import { ClockPanel } from './components/clock-panel'
import { MenuPanel } from './components/menu-panel'
import { LocationMap } from './components/location-map'
import { PortraitHint } from './components/portrait-hint'
import { useForceDark } from './hooks/use-force-dark'
import { usePortraitPhone } from './hooks/use-portrait-phone'
import { RecentCallsigns } from '@/features/spectrum/components/recent-callsigns'
import { logsStore } from '@/features/logs/store'
import { speakingStore } from '@/features/speaking/store'
import { selfStore } from '@/stores/self'
import { settingsStore } from '@/stores/settings'
import { parseCallsignSsid } from '@/lib/utils/callsign'
import { gridToLatLng, type LatLng } from '@/lib/utils/grid'
import type { LocalQso, QsoSummary } from '@/types/qso'

function isSameOperator(a: string, b: string): boolean {
  if (!a || !b) return false
  try {
    return parseCallsignSsid(a).call === parseCallsignSsid(b).call
  } catch {
    return false
  }
}

/** 从日志里反查某呼号最近一条带网格的记录 → 坐标。查不到返回 null。 */
function lookupCoord(
  callsign: string,
  all: readonly QsoSummary[],
  local: readonly LocalQso[]
): LatLng | null {
  // all 已按时间倒序，第一条命中即最近
  for (const r of all) {
    if (r.toCallsign === callsign && r.grid) return gridToLatLng(r.grid)
  }
  let best: { ts: number; grid: string } | null = null
  for (const r of local) {
    if (r.toCallsign === callsign && r.grid && (!best || r.timestamp > best.ts)) {
      best = { ts: r.timestamp, grid: r.grid }
    }
  }
  return best ? gridToLatLng(best.grid) : null
}

/**
 * 首页 v3：值守监控屏。地图满屏铺底，右侧一列 HUD 信息浮层。
 * 设计：docs/superpowers/specs/2026-06-07-dashboard-v3-design.md
 */
export function HomeView() {
  const { t } = useTranslation()
  const current = speakingStore((s) => s.current)
  const lastSpeaker = speakingStore((s) => s.lastSpeaker)
  const myCallsign = settingsStore((s) => s.currentCallsign)
  const myCoord = selfStore((s) => s.coordinate)
  const allLogs = logsStore((s) => s.all)
  const localLogs = logsStore((s) => s.local)
  const portrait = usePortraitPhone()
  useForceDark()

  // 名册点击 → 地图聚焦该呼号；再点一次取消
  const [focusCall, setFocusCall] = useState<string | null>(null)

  // 新讲话者开口时解除聚焦 —— 值守优先级最高
  useEffect(() => {
    if (current) setFocusCall(null)
  }, [current])

  const speaker = current ?? lastSpeaker
  const theirCoord = speaker ? gridToLatLng(speaker.grid) : null
  const isSelf = speaker !== null && isSameOperator(speaker.callsign, myCallsign)
  // 自己：地图只定位到自己单点（无连线 —— 自距离无意义且坐标解析有误差）；
  // 对方：标对方网格 + 我方坐标 + 连线（hero 另显距离文字）。
  const speakerTarget = isSelf ? (myCoord ?? theirCoord) : theirCoord
  const speakerMe = isSelf ? null : myCoord

  // 聚焦中：地图定位到被聚焦呼号（我方坐标照画连线）；否则跟随讲话者
  const focusCoord = focusCall ? lookupCoord(focusCall, allLogs, localLogs) : null
  const mapTarget = focusCoord ?? speakerTarget
  const mapMe = focusCoord ? myCoord : speakerMe
  // 讲话者在但坐标解析不出（无网格）：地图保持当前视角，不跳 idle/仅我
  const mapHold = focusCoord === null && speaker !== null && speakerTarget === null

  function handleRosterSelect(callsign: string) {
    if (focusCall === callsign) {
      setFocusCall(null)
      return
    }
    if (!lookupCoord(callsign, allLogs, localLogs)) {
      toast.info(t('home.focusNoPosition', { callsign }))
      return
    }
    setFocusCall(callsign)
  }

  if (portrait) {
    return (
      <div data-testid="home-dashboard" className="relative h-full w-full overflow-hidden">
        <PortraitHint />
      </div>
    )
  }

  return (
    <div data-testid="home-dashboard" className="relative h-full w-full overflow-hidden">
      <LocationMap target={mapTarget} me={mapMe} hold={mapHold} />

      {/* 右侧 HUD 信息列：时钟+菜单 → Hero → 名册（地图独占左侧） */}
      <div className="absolute bottom-3 right-3 top-3 z-10 flex w-[min(440px,38vw)] flex-col gap-2">
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <ClockPanel />
          </div>
          <MenuPanel />
        </div>

        <SpeakerHero />

        <div className="hud-frame hud-overlay flex min-h-0 flex-1 flex-col">
          <div className="hud-mono px-3 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {t('home.panelRoster')}
          </div>
          <div className="min-h-0 overflow-y-auto">
            <RecentCallsigns onSelect={handleRosterSelect} selected={focusCall} />
          </div>
        </div>
      </div>
    </div>
  )
}
