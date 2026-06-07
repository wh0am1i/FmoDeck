import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { ConnectionErrorBanner } from './connection-error-banner'
import { Footer } from './footer'
import { Header } from './header'
import { Nav } from './nav'
import { DASHBOARD_PATH } from './nav-items'
import { ScanlineOverlay } from './scanline-overlay'
import { SpeakingBar } from './speaking-bar'
import { WelcomeBanner } from './welcome-banner'

export function AppShell({ children }: { children: ReactNode }) {
  const isDashboard = useLocation().pathname === DASHBOARD_PATH

  // 值守监控屏：满屏满高、无 Header/Nav/Footer（导航走页内 ☰ 菜单）。
  if (isDashboard) {
    return (
      <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <WelcomeBanner />
        <ConnectionErrorBanner />
        <main className="relative min-h-0 flex-1">{children}</main>
        <ScanlineOverlay />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <WelcomeBanner />
      <ConnectionErrorBanner />
      <SpeakingBar />
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Nav />
        <main className="mt-6">{children}</main>
      </div>
      <Footer />
      <ScanlineOverlay />
    </div>
  )
}
