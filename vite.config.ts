import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import path from 'node:path'

// 让同一个 dev server 既服务浏览器版也服务 Tauri 壳。Tauri 会在
// 启动时设 TAURI_DEV_HOST 环境变量；有这个变量时我们让 Vite 监听
// 全 IP 并开启 HMR，让 WebView 能连上。
const tauriHost = process.env.TAURI_DEV_HOST

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
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Tauri 需要固定端口 + 禁用其他端口抢占
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: tauriHost ?? true,
    hmr: tauriHost
      ? {
          protocol: 'ws',
          host: tauriHost,
          port: 1421
        }
      : undefined,
    watch: {
      // 别把 src-tauri 当 frontend 源扫描，避免触发 HMR
      ignored: ['**/src-tauri/**']
    }
  }
})
