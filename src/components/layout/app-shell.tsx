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
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* 状态栏遮罩（fixed 钉在视口顶部）+ 等高占位（把 Header 推下去）。
          position: sticky 在 Tauri Android 的 WebView flex 布局里会失灵，
          改用 fixed + spacer 更稳。高度 40px 覆盖绝大多数 Android 状态栏
          （iOS notch 通过 env 取实际值，最小也保 40）。桌面 sm:hidden。 */}
      <div
        className="fixed inset-x-0 top-0 z-50 bg-background sm:hidden"
        style={{ height: 'max(env(safe-area-inset-top), 40px)' }}
        aria-hidden="true"
      />
      <div
        className="shrink-0 sm:hidden"
        style={{ height: 'max(env(safe-area-inset-top), 40px)' }}
        aria-hidden="true"
      />
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
