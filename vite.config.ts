import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import legacy from '@vitejs/plugin-legacy'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// 让同一个 dev server 既服务浏览器版也服务 Tauri 壳。Tauri 会在
// 启动时设 TAURI_DEV_HOST 环境变量;有这个变量时我们让 Vite 监听
// 全 IP 并开启 HMR，让 WebView 能连上。
const tauriHost = process.env.TAURI_DEV_HOST

// 仅 legacy 模式:把启动安全网脚本 + 结构性 CSS 兜底注入 legacy 的 index.html。
// 主构建不加载此插件,故主产物不变。
function legacyHtmlPlugin(): PluginOption {
  const fallbackCss = readFileSync(
    path.resolve(__dirname, 'src/styles/legacy-fallbacks.css'),
    'utf-8'
  )
  return {
    name: 'fmodeck-legacy-html',
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [
          {
            tag: 'style',
            attrs: { 'data-legacy-fallback': '' },
            children: fallbackCss,
            injectTo: 'head'
          },
          {
            // 启动安全网:8s 内 React 未挂载(#root 为空)则显示静态提示而非白屏。
            tag: 'script',
            children: `(function(){var T=8000;setTimeout(function(){var r=document.getElementById('root');if(r&&r.childElementCount===0){r.innerHTML='<div style="font-family:sans-serif;color:#cdd;background:#0a0014;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;line-height:1.6">'+'设备浏览器内核过旧,FmoDeck 可能无法正常运行。<br/>建议升级系统 WebView 或更换设备。<br/><br/>This device&rsquo;s browser engine is too old to run FmoDeck reliably.</div>';}},T);})();`,
            injectTo: 'body'
          }
        ]
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const isLegacy = mode === 'legacy'
  return {
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
      ...(isLegacy
        ? [
            legacy({
              targets: ['Chrome 61'],
              // 只产单一 legacy 包(SystemJS + core-js polyfill),不产现代包。
              renderModernChunks: false
            }),
            legacyHtmlPlugin()
          ]
        : [])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // Tauri 需要固定端口 + 禁用其他端口抢占
    clearScreen: false,
    build: isLegacy ? { outDir: 'dist-legacy' } : {},
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
  }
})
