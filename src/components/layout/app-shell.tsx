import type { ReactNode } from 'react'
import { ConnectionErrorBanner } from './connection-error-banner'
import { Header } from './header'
import { Nav } from './nav'
import { SpeakingBar } from './speaking-bar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <ConnectionErrorBanner />
      <SpeakingBar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Nav />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  )
}
