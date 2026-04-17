import type { ReactNode } from 'react'
import { ConnectionErrorBanner } from './connection-error-banner'
import { Header } from './header'
import { Nav } from './nav'
import { ScanlineOverlay } from './scanline-overlay'
import { SpeakingBar } from './speaking-bar'
import { WelcomeBanner } from './welcome-banner'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Header />
      <WelcomeBanner />
      <ConnectionErrorBanner />
      <SpeakingBar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Nav />
        <main className="mt-6">{children}</main>
      </div>
      <ScanlineOverlay />
    </div>
  )
}
