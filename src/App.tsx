import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { useFmoSync } from '@/hooks/useFmoSync'
import { useSpeakingEvents } from '@/hooks/useSpeakingEvents'
import { useStationSync } from '@/hooks/useStationSync'
import { useSyncPolicy } from '@/hooks/useSyncPolicy'

export function App() {
  useFmoSync()
  useSpeakingEvents()
  useSyncPolicy()
  useStationSync()

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
