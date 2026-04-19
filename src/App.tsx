import { useEffect } from 'react'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { logsStore } from '@/features/logs/store'
import { useFmoAudio } from '@/hooks/useFmoAudio'
import { useFmoSync } from '@/hooks/useFmoSync'
import { useHudStyles } from '@/hooks/useHudStyles'
import { useSpeakingEvents } from '@/hooks/useSpeakingEvents'
import { useStationPolling } from '@/hooks/useStationPolling'
import { useStationSync } from '@/hooks/useStationSync'
import { useSyncPolicy } from '@/hooks/useSyncPolicy'
import { UpdateDialog } from '@/features/updater/update-dialog'
import { useUpdateCheck } from '@/hooks/useUpdateCheck'

export function App() {
  useFmoSync()
  useSpeakingEvents()
  useSyncPolicy()
  useStationSync()
  useStationPolling()
  useFmoAudio()
  useHudStyles()
  useUpdateCheck()

  // 启动时从 IndexedDB 读入本地 ADIF 导入的 QSO（任何视图都能马上看到）
  useEffect(() => {
    void logsStore.getState().loadLocal()
  }, [])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
        <UpdateDialog />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
