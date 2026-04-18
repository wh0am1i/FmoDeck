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
    // 整个应用锁定在视口里（h-dvh + overflow-hidden），内部用
    // overflow-y-auto 做滚动。这样顶部的 40px 状态栏保护条永远在
    // 视口最上方，怎么滚动都不会跑到屏幕外面。
    // Tauri Android WebView 的 position: sticky / fixed / env() 都
    // 不稳，这个"内部滚动容器"方案是各种 WebView / 浏览器都吃的方案。
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* 状态栏保护：40px 实底条，始终在视口顶部（不在滚动区里）。
          不加 sm:hidden，因为 Tauri Android WebView 的 CSS 宽度不一定
          < 640px（有时被当 desktop mode），加了反而会被隐藏。桌面上
          顶部多 40px 留白是可以接受的代价。 */}
      <div className="h-10 shrink-0 bg-background" aria-hidden="true" />

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header />
        <WelcomeBanner />
        <ConnectionErrorBanner />
        <SpeakingBar />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Nav />
          <main className="mt-6">{children}</main>
        </div>
        <Footer />
      </div>
      <ScanlineOverlay />
    </div>
  )
}
