import type { ReactNode } from 'react'
import { ConnectionErrorBanner } from './connection-error-banner'
import { Footer } from './footer'
import { Header } from './header'
import { Nav } from './nav'
import { ScanlineOverlay } from './scanline-overlay'
import { SpeakingBar } from './speaking-bar'
import { WelcomeBanner } from './welcome-banner'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={
        'relative flex min-h-screen flex-col bg-background text-foreground ' +
        // 移动端：状态栏至少 28px 兜底（Android WebView 有时不吐 env 值）；
        // 有 notch 的 iOS 走 env() 实际值（44px+）。桌面 sm+ 不留白
        'pt-[max(env(safe-area-inset-top),28px)] sm:pt-0'
      }
    >
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
