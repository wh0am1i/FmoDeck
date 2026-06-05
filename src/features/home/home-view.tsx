import { useTranslation } from 'react-i18next'
import { SpeakerHero } from './components/speaker-hero'
import { TodayStats } from './components/today-stats'
import { DashboardPanel } from './components/dashboard-panel'
import { StationSwitcher } from '@/features/station/components/station-switcher'
import { RecentCallsigns } from '@/features/spectrum/components/recent-callsigns'
import { SpectrumVisualizer } from '@/features/audio/components/spectrum-visualizer'

export function HomeView() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <div className="hud-frame flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <StationSwitcher />
        <TodayStats />
      </div>

      <SpeakerHero />

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
