import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint .',
        useFlatConfig: true
      },
      overlay: { initialIsOpen: false }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'FmoDeck',
        short_name: 'FmoDeck',
        description: '业余无线电 FMO 平台的日志与控制台 · 战术 HUD 主题',
        theme_color: '#00D9FF',
        background_color: '#05060F',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // SPA fallback（离线时路由都走 index.html）
        navigateFallback: '/index.html',
        // sql.js / wasm 文件也要缓存
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        // 设备 /ws 和 /events 是 WebSocket，不走 workbox；HTTP 请求走网络优先
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'html', networkTimeoutSeconds: 3 }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true
  }
})
