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
      {/* 状态栏保护条：position: sticky 永远贴在视口最顶部，滚动时不会
          被内容顶穿。Android WebView 里 env(safe-area-inset-top) 有时
          返回 0，所以 max() 兜底 36px；iOS 带 notch 走 env 实际值。
          桌面 sm:hidden 不渲染。高度用 inline style 避免 Tailwind JIT
          在 arbitrary value 里错误处理 max() + env() 的组合。 */}
      <div
        className="sticky top-0 z-50 w-full bg-background sm:hidden"
        style={{ height: 'max(env(safe-area-inset-top), 36px)' }}
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
