import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
