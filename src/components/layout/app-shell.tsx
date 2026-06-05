import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { ConnectionErrorBanner } from './connection-error-banner'
import { Footer } from './footer'
import { Header } from './header'
import { Nav } from './nav'
import { ScanlineOverlay } from './scanline-overlay'
import { SpeakingBar } from './speaking-bar'
import { WelcomeBanner } from './welcome-banner'

export function AppShell({ children }: { children: ReactNode }) {
  const isHome = useLocation().pathname === '/'
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <WelcomeBanner />
      <ConnectionErrorBanner />
      {!isHome && <SpeakingBar />}
      <div className={cn('w-full flex-1 px-4 py-6', isHome ? 'mx-auto' : 'mx-auto max-w-7xl')}>
        <Nav />
        <main className="mt-6">{children}</main>
      </div>
      <Footer />
      <ScanlineOverlay />
    </div>
  )
}
