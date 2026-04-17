import { useEffect } from 'react'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { logsStore } from '@/features/logs/store'
import { useFmoSync } from '@/hooks/useFmoSync'
import { useHudStyles } from '@/hooks/useHudStyles'
import { useSpeakingEvents } from '@/hooks/useSpeakingEvents'
import { useStationSync } from '@/hooks/useStationSync'
import { useSyncPolicy } from '@/hooks/useSyncPolicy'

export function App() {
  useFmoSync()
  useSpeakingEvents()
  useSyncPolicy()
  useStationSync()
  useHudStyles()

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
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
