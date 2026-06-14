// autoprefixer 无 .d.ts 类型声明(tailwindcss3 走别名包自带类型)
declare module 'autoprefixer'

import { defineConfig, transformWithEsbuild, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import legacy from '@vitejs/plugin-legacy'
import tailwindcssV3 from 'tailwindcss3'
import autoprefixer from 'autoprefixer'
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
            // 启动安全网:非破坏式浮层 + 持续轮询。React 一旦挂上(#root 有子节点)
            // 就自动撤掉提示——慢设备冷启动 >8s 不再误报;只有持续 15s 仍空白才显示。
            // 纯 ES5(var/function/setInterval/Date.now),不覆盖 #root(用独立浮层)。
            tag: 'script',
            children: `(function(){var W=15000,warned=false,el=null,start=Date.now();function has(){var r=document.getElementById('root');return r&&r.childElementCount>0;}function show(){if(warned)return;warned=true;el=document.createElement('div');el.id='legacy-too-old';el.setAttribute('style','position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;font-family:sans-serif;color:#cdd;background:#0a0014;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;line-height:1.6');el.innerHTML='设备浏览器内核过旧,FmoDeck 可能无法正常运行。<br/>建议升级系统 WebView 或更换设备。<br/><br/>This device&rsquo;s browser engine is too old to run FmoDeck reliably.';document.body.appendChild(el);}function hide(){if(el&&el.parentNode){el.parentNode.removeChild(el);}el=null;}var iv=setInterval(function(){if(has()){hide();clearInterval(iv);return;}if(!warned&&Date.now()-start>=W){show();}},500);})();`,
            injectTo: 'body'
          }
        ]
      }
    }
  }
}

// 仅 legacy:把主入口 import 的 globals.css(Tailwind v4)重定向到 legacy.css
// (Tailwind v3,Chromium 61 兼容)。不改 main.tsx,故主构建不受影响。
function legacyCssRedirectPlugin(): PluginOption {
  const legacyCss = path.resolve(__dirname, 'src/styles/legacy.css')
  return {
    name: 'fmodeck-legacy-css-redirect',
    enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('styles/globals.css')) return legacyCss
      return null
    }
  }
}

// 仅 legacy:@vitejs/plugin-legacy 的 babel 产物并未把 ?. / ?? / 数字分隔符等语法
// 降级(它在 esbuild 之后用自己的 pass 生成最终 chunk),Chromium 61 解析会
// SyntaxError → 白屏。这里 enforce:'post' 用 esbuild 把最终 .js 再降一遍到 chrome61。
// (CSS 由 Tailwind v3 + autoprefixer + build.cssTarget=chrome61 处理,无需再降。)
function legacyLowerPlugin(): PluginOption {
  return {
    name: 'fmodeck-legacy-es-lower',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      for (const [fileName, item] of Object.entries(bundle)) {
        if (!fileName.endsWith('.js')) continue
        if (item.type === 'chunk') {
          const r = await transformWithEsbuild(item.code, fileName, {
            target: 'chrome61',
            minify: true,
            legalComments: 'none'
          })
          item.code = r.code
        } else if (typeof item.source === 'string') {
          const r = await transformWithEsbuild(item.source, fileName, {
            target: 'chrome61',
            minify: true,
            legalComments: 'none'
          })
          item.source = r.code
        }
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const isLegacy = mode === 'legacy'
  return {
    plugins: [
      react(),
      // 主包用 Tailwind v4 vite 插件;legacy 改用 PostCSS + Tailwind v3(见下 css 配置)
      ...(isLegacy ? [] : [tailwindcss()]),
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
            legacyCssRedirectPlugin(),
            legacyHtmlPlugin(),
            legacyLowerPlugin()
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
    // legacy:用 Tailwind v3 + autoprefixer 生成 Chromium 61 兼容的 CSS。
    css: isLegacy
      ? {
          postcss: {
            plugins: [
              tailwindcssV3(path.resolve(__dirname, 'tailwind.legacy.config.cjs')),
              autoprefixer({ overrideBrowserslist: ['Chrome >= 61', 'Android >= 5'] })
            ]
          }
        }
      : {},
    // legacy:esbuild 压缩 CSS 时也按 chrome61(避免输出现代颜色/语法)
    build: isLegacy ? { outDir: 'dist-legacy', cssTarget: 'chrome61' } : {},
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
