import { defineConfig, transformWithEsbuild, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
import legacy from '@vitejs/plugin-legacy'
// 用整体命名空间导入,而不是具名解构。Tailwind v4 会扫描本文件的纯文本(含注释)
// 找 class 候选;具名解构会把别名前的原名暴露成裸 token,被误当成 utility 注入
// 主包 CSS。命名空间导入避免裸 token,保持主包产物不变。
import * as lightningcss from 'lightningcss'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// legacy CSS 降级目标(Chromium 61)。Lightning CSS 的版本编码是 major<<16,
// 据此把 oklch / 静态 color-mix 等降级成老 WebView 认得的颜色。
const legacyCssTargets = { chrome: 61 << 16 }

// 摊平 Tailwind v4 的级联层 @layer:Chromium <99 不认 @layer,遇到会把整个
// {…} 块直接丢弃 → 几乎全部样式失效(白底黑字)。Lightning CSS 不摊平 layer
// (它保留 layer 语义),所以这里手工去掉 @layer 包裹、保留内部规则。Tailwind
// 输出本就按 theme→base→components→utilities 顺序排,摊平后源码顺序即优先级,够用。
function stripCascadeLayers(css: string): string {
  // 语句式:@layer a, b, c;
  let s = css.replace(/@layer[^{};]*;/g, '')
  // 块式:@layer name { ... } —— 去包裹留内容(可能多层,循环到稳定)
  for (let pass = 0; pass < 5 && s.includes('@layer'); pass++) {
    let res = ''
    let i = 0
    while (i < s.length) {
      if (s.startsWith('@layer', i)) {
        const brace = s.indexOf('{', i)
        if (brace === -1) {
          res += s.slice(i)
          break
        }
        i = brace + 1
        let depth = 1
        while (i < s.length && depth > 0) {
          const ch = s.charAt(i)
          if (ch === '{') {
            depth++
            res += ch
          } else if (ch === '}') {
            depth--
            if (depth > 0) res += ch
          } else {
            res += ch
          }
          i++
        }
      } else {
        res += s.charAt(i)
        i++
      }
    }
    s = res
  }
  return s
}

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

// 仅 legacy 的产物兜底降级(enforce:'post',在所有插件之后跑):
//  · JS:@vitejs/plugin-legacy 的 babel 产物并未把 ?. / ?? / 数字分隔符等语法
//    降级(它在 Vite 的 esbuild build.target 之后用自己的 pass 生成最终 chunk,
//    build.target 够不着),Chromium 61 解析会 SyntaxError → 白屏。用 esbuild
//    把最终 .js 再降一遍到 chrome61。
//  · CSS:Lightning CSS 把 oklch / 静态 color-mix 等降级成老 WebView 认得的颜色,
//    再手工摊平 @layer(否则 Chromium 61 整块丢弃 → 几乎裸样式)。
function legacyLowerPlugin(): PluginOption {
  return {
    name: 'fmodeck-legacy-es-lower',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      for (const [fileName, item] of Object.entries(bundle)) {
        if (fileName.endsWith('.js')) {
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
        } else if (
          fileName.endsWith('.css') &&
          item.type === 'asset' &&
          typeof item.source === 'string'
        ) {
          const out = lightningcss.transform({
            filename: fileName,
            code: Buffer.from(item.source),
            targets: legacyCssTargets,
            minify: true
          })
          item.source = stripCascadeLayers(out.code.toString())
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
