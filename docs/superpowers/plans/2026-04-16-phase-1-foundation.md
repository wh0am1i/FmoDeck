# FmoDeck Phase 1 · 地基 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 FmoDeck 的基础脚手架 —— Vite 7 + React 19 + TypeScript strict + Tailwind v4 + shadcn/ui + React Router v7 + HUD 主题基础 + 测试/质量工具链 + CI。产出一个"空壳但可跑"的 5 路由应用，为 Phase 2/3/4 的业务代码提供地基。

**Architecture:** 纯客户端 SPA。Vite 作为构建工具，React 19 + TypeScript strict 作为 UI 基础，Tailwind v4 通过 CSS 变量承载 HUD 主题 token，shadcn/ui 提供组件原语。状态/数据层（Zustand、sql.js、WebSocket）均**不**在本阶段引入。

**Tech Stack:** Vite 7 · React 19 · TypeScript 5.7+ · Tailwind CSS v4 · shadcn/ui · Radix · React Router v7 · Vitest 2 · jsdom · ESLint 9 · Prettier 3 · pnpm · GitHub Actions

---

## 文件结构（Phase 1 结束时应有的所有文件）

```
/Users/wh0am1i/FmoDeck/
├── .github/
│   └── workflows/
│       └── ci.yml                                 新建
├── docs/
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-04-16-fmodeck-migration-design.md   (已存在)
│       └── plans/
│           └── 2026-04-16-phase-1-foundation.md         (本文件)
├── public/
│   └── favicon.svg                                新建
├── src/
│   ├── app/
│   │   ├── routes.tsx                             新建 · 路由表
│   │   └── providers/
│   │       └── theme-provider.tsx                 新建 · 主题 Provider
│   ├── components/
│   │   ├── ui/                                    新建 · shadcn 组件
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── popover.tsx
│   │   │   └── tooltip.tsx
│   │   └── layout/
│   │       ├── app-shell.tsx                      新建 · 页面外壳
│   │       ├── header.tsx                         新建 · 顶部栏
│   │       ├── nav.tsx                            新建 · 路由 Tab
│   │       └── speaking-bar.tsx                   新建 · 讲话条占位
│   ├── features/
│   │   ├── logs/logs-view.tsx                     新建 · 占位视图
│   │   ├── top20/top20-view.tsx                   新建
│   │   ├── old-friends/old-friends-view.tsx       新建
│   │   ├── messages/messages-view.tsx             新建
│   │   └── settings/settings-view.tsx             新建
│   ├── lib/
│   │   ├── utils.ts                               新建 · cn() 等工具
│   │   └── utils.test.ts                          新建 · cn() 单测
│   ├── styles/
│   │   └── globals.css                            新建 · Tailwind + HUD 主题
│   ├── App.tsx                                    新建 · 根组件
│   ├── main.tsx                                   新建 · 入口
│   └── vite-env.d.ts                              新建
├── tests/
│   ├── setup.ts                                   新建 · Vitest 全局 setup
│   └── app.test.tsx                               新建 · 烟雾测试
├── .gitignore                                     (已存在，本阶段会扩充)
├── .prettierrc                                    新建
├── .prettierignore                                新建
├── components.json                                新建 · shadcn 配置
├── eslint.config.js                               新建 · ESLint 9 flat config
├── index.html                                     新建
├── package.json                                   新建
├── pnpm-lock.yaml                                 自动生成
├── README.md                                      (已存在，本阶段会扩充)
├── tsconfig.json                                  新建
├── tsconfig.app.json                              新建
├── tsconfig.node.json                             新建
├── vite.config.ts                                 新建
└── vitest.config.ts                               新建
```

**文件职责边界**：
- `src/app/` — 路由、Provider 这类"应用级装配"关注点
- `src/components/` — 纯视图组件（`ui/` shadcn，`layout/` 布局）
- `src/features/` — 按业务垂直切片，本阶段只放占位视图
- `src/lib/` — 框架无关工具（本阶段只有 `cn()`；Phase 2 会大量扩充）
- `src/styles/` — 全局 CSS + Tailwind 入口
- `tests/` — Vitest 测试（App 级烟雾测试放这里；`*.test.ts` 单测紧邻源码放置）

---

## 前置准备

确认 Node ≥ 20.19 和 pnpm 已安装：

```bash
node -v   # 期望 ≥ 20.19
pnpm -v   # 期望 ≥ 9.0
```

若 pnpm 未安装：`npm install -g pnpm`

工作目录：`/Users/wh0am1i/FmoDeck`（所有命令都在这里执行）。

---

## Task 1: 初始化 pnpm 项目 + 安装核心依赖

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/package.json`

- [ ] **Step 1: 运行 pnpm init 生成 package.json**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm init
```

- [ ] **Step 2: 用下面的完整内容覆盖 package.json**

```json
{
  "name": "fmodeck",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "description": "业余无线电 FMO 平台的下一代日志与控制台",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^7.0.0"
  }
}
```

- [ ] **Step 3: 安装依赖**

```bash
pnpm install
```

期望输出：无错误，`node_modules/` 创建。`pnpm-lock.yaml` 生成。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: 初始化 pnpm 项目和核心依赖"
```

---

## Task 2: Vite + TypeScript 配置 + 最小可跑入口

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/vite.config.ts`
- Create: `/Users/wh0am1i/FmoDeck/tsconfig.json`
- Create: `/Users/wh0am1i/FmoDeck/tsconfig.app.json`
- Create: `/Users/wh0am1i/FmoDeck/tsconfig.node.json`
- Create: `/Users/wh0am1i/FmoDeck/index.html`
- Create: `/Users/wh0am1i/FmoDeck/src/main.tsx`
- Create: `/Users/wh0am1i/FmoDeck/src/App.tsx`
- Create: `/Users/wh0am1i/FmoDeck/src/vite-env.d.ts`

- [ ] **Step 1: 创建 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
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
```

- [ ] **Step 2: 创建根 tsconfig.json（project references）**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: 创建 tsconfig.app.json（严格模式 + 路径别名）**

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "skipLibCheck": true,

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: 创建 tsconfig.node.json（Vite/Vitest 配置文件用）**

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "eslint.config.js"]
}
```

- [ ] **Step 5: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FmoDeck</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 7: 创建 src/App.tsx（临时最小版本）**

```tsx
export function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>FmoDeck</h1>
      <p>Phase 1 scaffolding in progress.</p>
    </div>
  )
}

export default App
```

- [ ] **Step 8: 创建 src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 9: 创建 public/favicon.svg（HUD 风格占位）**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/public
```

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="2" y="2" width="28" height="28" fill="#0A0014" stroke="#00D9FF" stroke-width="2"/>
  <path d="M8 8 L8 4 L4 4 M24 4 L28 4 L28 8 M28 24 L28 28 L24 28 M4 24 L4 28 L8 28" stroke="#00D9FF" stroke-width="1.5"/>
  <text x="16" y="21" font-family="monospace" font-size="10" fill="#00D9FF" text-anchor="middle">FD</text>
</svg>
```

把上述 SVG 内容写入 `/Users/wh0am1i/FmoDeck/public/favicon.svg`。

- [ ] **Step 10: 验证 dev server 启动**

```bash
pnpm dev
```

期望输出：`VITE v7.x.x  ready in XXXX ms` 以及 `Local:   http://localhost:5173/`。在浏览器打开 http://localhost:5173/ 应看到 "FmoDeck Phase 1 scaffolding in progress."。Ctrl+C 停止 dev server。

- [ ] **Step 11: 验证 typecheck 通过**

```bash
pnpm typecheck
```

期望：无输出（0 error）。

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "feat: 搭建 Vite + React 19 + TS strict 基础脚手架"
```

---

## Task 3: Tailwind CSS v4 + HUD 主题 token

**Files:**
- Modify: `/Users/wh0am1i/FmoDeck/package.json`（添加依赖）
- Modify: `/Users/wh0am1i/FmoDeck/vite.config.ts`（加载 Tailwind 插件）
- Create: `/Users/wh0am1i/FmoDeck/src/styles/globals.css`
- Modify: `/Users/wh0am1i/FmoDeck/src/main.tsx`（导入 globals.css）

- [ ] **Step 1: 安装 Tailwind v4**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm add -D tailwindcss@^4 @tailwindcss/vite@^4
```

- [ ] **Step 2: 在 vite.config.ts 加 Tailwind 插件**

用下面完整内容覆盖 `vite.config.ts`：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
```

- [ ] **Step 3: 创建 src/styles/globals.css（Tailwind v4 + HUD 主题）**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/styles
```

写入 `/Users/wh0am1i/FmoDeck/src/styles/globals.css`：

```css
@import "tailwindcss";

/* ==========================================================
   HUD 主题 · CSS 变量
   深色为默认（dark class），浅色走 light class 覆盖
   ========================================================== */

:root,
.dark {
  /* 语义色（shadcn 兼容 · HSL 三元组） */
  --background: 270 100% 4%;
  --foreground: 214 30% 91%;
  --card: 270 60% 7%;
  --card-foreground: 214 30% 91%;
  --popover: 270 60% 7%;
  --popover-foreground: 214 30% 91%;
  --primary: 190 100% 50%;
  --primary-foreground: 270 100% 4%;
  --secondary: 214 30% 20%;
  --secondary-foreground: 214 30% 91%;
  --muted: 214 20% 15%;
  --muted-foreground: 214 20% 65%;
  --accent: 41 100% 50%;
  --accent-foreground: 270 100% 4%;
  --destructive: 352 100% 62%;
  --destructive-foreground: 0 0% 100%;
  --border: 190 60% 40%;
  --input: 214 20% 15%;
  --ring: 190 100% 50%;
  --radius: 2px;

  /* HUD 装饰强度 */
  --hud-intensity: 1;
  --hud-scanline-opacity: 0.05;
  --hud-glitch-duration: 0.3s;
}

.light {
  --background: 0 0% 98%;
  --foreground: 270 50% 10%;
  --card: 0 0% 100%;
  --card-foreground: 270 50% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 270 50% 10%;
  --primary: 190 100% 35%;
  --primary-foreground: 0 0% 100%;
  --secondary: 214 20% 90%;
  --secondary-foreground: 270 50% 10%;
  --muted: 214 20% 92%;
  --muted-foreground: 214 20% 40%;
  --accent: 41 100% 40%;
  --accent-foreground: 0 0% 100%;
  --destructive: 352 80% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 190 60% 60%;
  --input: 214 20% 92%;
  --ring: 190 100% 35%;
}

/* ==========================================================
   Tailwind v4 主题扩展 · 把 CSS 变量挂给 Tailwind 色板
   ========================================================== */

@theme inline {
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;

  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));

  --radius-sm: calc(var(--radius) - 1px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 2px);
}

/* ==========================================================
   全局基础样式
   ========================================================== */

@layer base {
  * {
    border-color: hsl(var(--border));
  }
  html,
  body {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
  }
  body {
    min-height: 100vh;
  }
  ::selection {
    background: hsl(var(--primary) / 0.4);
    color: hsl(var(--primary-foreground));
  }
  /* 自定义滚动条 —— HUD 风格 */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track {
    background: hsl(var(--muted));
  }
  ::-webkit-scrollbar-thumb {
    background: hsl(var(--primary) / 0.5);
    border-radius: var(--radius);
  }
  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--primary) / 0.7);
  }
  /* 聚焦态 · 霓虹描边 */
  :focus-visible {
    outline: 1px solid hsl(var(--ring));
    outline-offset: 1px;
    box-shadow: 0 0 calc(8px * var(--hud-intensity)) hsl(var(--ring) / 0.5);
  }
}

/* ==========================================================
   HUD 专属工具类
   ========================================================== */

@layer utilities {
  .hud-frame {
    position: relative;
    border: 1px solid hsl(var(--border));
  }
  .hud-frame::before,
  .hud-frame::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    border: 1.5px solid hsl(var(--primary));
  }
  .hud-frame::before {
    top: -1px;
    left: -1px;
    border-right: none;
    border-bottom: none;
  }
  .hud-frame::after {
    bottom: -1px;
    right: -1px;
    border-left: none;
    border-top: none;
  }
  .hud-glow {
    box-shadow:
      0 0 calc(8px * var(--hud-intensity))
      hsl(var(--primary) / calc(0.4 * var(--hud-intensity)));
  }
  .hud-mono {
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
  }
  .hud-title {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 600;
  }
}
```

- [ ] **Step 4: 在 main.tsx 导入 globals.css**

用下面完整内容覆盖 `src/main.tsx`：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: 临时把 App.tsx 改用 Tailwind 类验证**

用下面完整内容覆盖 `src/App.tsx`：

```tsx
export function App() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="hud-title text-2xl text-primary mb-2">FmoDeck</h1>
      <p className="hud-mono text-sm text-muted-foreground">
        Phase 1 scaffolding · Tailwind + HUD theme check
      </p>
      <div className="hud-frame hud-glow mt-6 p-4 inline-block">
        <span className="hud-mono text-primary">[ HUD FRAME TEST ]</span>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 6: 启动 dev 验证**

```bash
pnpm dev
```

浏览器访问 http://localhost:5173/，期望看到：
- 深紫黑背景（HUD 默认暗色）
- 标题"FmoDeck"为青色霓虹
- 下方"HUD FRAME TEST"卡片有细线边框、四角定位符（`┌┐└┘` 效果）和微辉光

Ctrl+C 停止 dev server。

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: 接入 Tailwind v4 并配置 HUD 主题 token"
```

---

## Task 4: cn() 工具函数（TDD）

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/src/lib/utils.ts`
- Create: `/Users/wh0am1i/FmoDeck/src/lib/utils.test.ts`

> `cn()` 是 shadcn 约定的 className 合并工具，基于 `clsx` + `tailwind-merge`。shadcn 组件会 import `@/lib/utils`。本任务 TDD 实现它。

- [ ] **Step 1: 安装依赖**

```bash
pnpm add clsx tailwind-merge
```

- [ ] **Step 2: 创建失败的测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib
```

写入 `src/lib/utils.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('合并普通字符串', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('忽略 falsy 值', () => {
    expect(cn('foo', false, undefined, null, '', 'bar')).toBe('foo bar')
  })

  it('处理对象形式的条件类', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
  })

  it('处理数组', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('去重冲突的 Tailwind 类（后者覆盖前者）', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('保留不冲突的类', () => {
    expect(cn('p-4', 'm-2')).toBe('p-4 m-2')
  })
})
```

- [ ] **Step 3: 运行测试确认失败**

此时 Vitest 尚未配置，直接运行会失败。先安装 vitest：

```bash
pnpm add -D vitest@^2 jsdom@^25
```

然后创建临时 `vitest.config.ts`（Task 10 会完善它）：

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

运行：

```bash
pnpm test
```

期望：失败，提示找不到 `./utils` 或 `cn`。

- [ ] **Step 4: 实现 cn()**

写入 `src/lib/utils.ts`：

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm test
```

期望：6 个测试全部通过。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: 添加 cn() 工具函数和单元测试"
```

---

## Task 5: shadcn/ui 初始化 + 安装组件

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/components.json`
- Create: `src/components/ui/button.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `sonner.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `tooltip.tsx`

- [ ] **Step 1: 创建 components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: 安装 shadcn 必需的 Radix / 图标库依赖**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm add \
  @radix-ui/react-dialog@^1 \
  @radix-ui/react-dropdown-menu@^2 \
  @radix-ui/react-popover@^1 \
  @radix-ui/react-select@^2 \
  @radix-ui/react-slot@^1 \
  @radix-ui/react-tooltip@^1 \
  class-variance-authority@^0.7 \
  lucide-react@^0.468 \
  sonner@^1.7
pnpm add -D tw-animate-css@^1
```

- [ ] **Step 3: 用 shadcn CLI 批量添加组件**

```bash
pnpm dlx shadcn@latest add button dialog input select sonner dropdown-menu popover tooltip --yes
```

期望：在 `src/components/ui/` 下生成 8 个 `.tsx` 文件。CLI 可能同时修改 `globals.css` 加入 `@plugin "tw-animate-css";` 之类的行，这是期望的。

> **如果 CLI 交互式问答**：选择 `neutral` base color，其余默认。如果遇到 `utils.ts` 覆盖确认，选 **No**（保留 Task 4 写的版本；两者等价，但避免无意义变更）。

- [ ] **Step 4: 验证 shadcn 组件可被导入**

临时改 `src/App.tsx` 做烟雾验证：

```tsx
import { Button } from '@/components/ui/button'

export function App() {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <h1 className="hud-title text-2xl text-primary mb-2">FmoDeck</h1>
      <p className="hud-mono text-sm text-muted-foreground mb-6">
        Phase 1 scaffolding · shadcn integration check
      </p>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  )
}

export default App
```

- [ ] **Step 5: 启动 dev 确认 Button 组件可渲染**

```bash
pnpm dev
```

浏览器打开 http://localhost:5173/，看到 5 种按钮。颜色遵循 HUD 主题（primary 按钮为青色底）。Ctrl+C 停止。

- [ ] **Step 6: typecheck 通过**

```bash
pnpm typecheck
```

期望：0 error。

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: 初始化 shadcn/ui 并安装必备组件"
```

---

## Task 6: Theme Provider（dark / light / system）

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/src/app/providers/theme-provider.tsx`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/app/providers
```

- [ ] **Step 2: 实现 ThemeProvider**

写入 `src/app/providers/theme-provider.tsx`：

```tsx
import { createContext, use, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'fmodeck-theme'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function detectSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? detectSystemTheme() : theme
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      setResolvedTheme(theme === 'system' ? (media.matches ? 'dark' : 'light') : theme)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = (next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
```

> 注：使用 React 19 的 `use(Context)` 形式。

- [ ] **Step 3: typecheck 通过**

```bash
pnpm typecheck
```

期望：0 error。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: 添加 Theme Provider（支持 light/dark/system）"
```

---

## Task 7: App Shell 布局组件

**Files:**
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/nav.tsx`
- Create: `src/components/layout/speaking-bar.tsx`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/components/layout
```

- [ ] **Step 2: 创建 Header**

写入 `src/components/layout/header.tsx`：

```tsx
import { useTheme } from '@/app/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { Monitor, Moon, Sun } from 'lucide-react'

export function Header() {
  const { theme, setTheme } = useTheme()

  const next = (): void => {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon = theme === 'system' ? Monitor : theme === 'dark' ? Moon : Sun

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="hud-title text-primary">[ FMODECK ]</span>
          <span className="hud-mono text-xs text-muted-foreground">v0.1.0</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={next}
          aria-label={`切换主题（当前：${theme}）`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: 创建 Nav**

写入 `src/components/layout/nav.tsx`：

```tsx
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
}

const items: ReadonlyArray<NavItem> = [
  { to: '/logs', label: 'LOGS' },
  { to: '/top20', label: 'TOP 20' },
  { to: '/old-friends', label: 'OLD FRIENDS' },
  { to: '/messages', label: 'MSG' },
  { to: '/settings', label: 'SETTINGS' }
]

export function Nav() {
  return (
    <nav
      aria-label="主导航"
      className="hud-frame flex gap-0 bg-card/50"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'hud-mono hud-title px-4 py-2 text-sm transition-colors',
              'border-r border-border last:border-r-0',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: 创建 SpeakingBar 占位**

写入 `src/components/layout/speaking-bar.tsx`：

```tsx
export function SpeakingBar() {
  return (
    <div
      aria-label="讲话状态栏"
      className="border-b border-border bg-card/30 px-4 py-2"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <span className="hud-mono text-xs text-muted-foreground">[ SPEAKING BAR · PLACEHOLDER ]</span>
        <span className="hud-mono text-xs text-primary/60">
          Phase 4c 将实装实时讲话增强信息卡
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 创建 AppShell**

写入 `src/components/layout/app-shell.tsx`：

```tsx
import type { ReactNode } from 'react'
import { Header } from './header'
import { Nav } from './nav'
import { SpeakingBar } from './speaking-bar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <SpeakingBar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Nav />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: 实现 AppShell/Header/Nav/SpeakingBar 布局组件"
```

---

## Task 8: React Router v7 + 占位视图

**Files:**
- Create: `src/features/logs/logs-view.tsx`
- Create: `src/features/top20/top20-view.tsx`
- Create: `src/features/old-friends/old-friends-view.tsx`
- Create: `src/features/messages/messages-view.tsx`
- Create: `src/features/settings/settings-view.tsx`
- Create: `src/app/routes.tsx`
- Modify: `src/App.tsx`（接入 Router + Provider + Shell）

- [ ] **Step 1: 创建 feature 目录**

```bash
cd /Users/wh0am1i/FmoDeck/src
mkdir -p features/logs features/top20 features/old-friends features/messages features/settings
```

- [ ] **Step 2: 创建占位视图（五个，结构一致）**

写入 `src/features/logs/logs-view.tsx`：

```tsx
export function LogsView() {
  return (
    <section className="hud-frame p-6">
      <h2 className="hud-title text-primary mb-2">[ LOGS ]</h2>
      <p className="hud-mono text-sm text-muted-foreground">
        QSO 日志视图 · Phase 4b 实装
      </p>
    </section>
  )
}
```

写入 `src/features/top20/top20-view.tsx`：

```tsx
export function Top20View() {
  return (
    <section className="hud-frame p-6">
      <h2 className="hud-title text-primary mb-2">[ TOP 20 ]</h2>
      <p className="hud-mono text-sm text-muted-foreground">
        排行榜 · Phase 4d 实装
      </p>
    </section>
  )
}
```

写入 `src/features/old-friends/old-friends-view.tsx`：

```tsx
export function OldFriendsView() {
  return (
    <section className="hud-frame p-6">
      <h2 className="hud-title text-primary mb-2">[ OLD FRIENDS ]</h2>
      <p className="hud-mono text-sm text-muted-foreground">
        老朋友 · Phase 4e 实装
      </p>
    </section>
  )
}
```

写入 `src/features/messages/messages-view.tsx`：

```tsx
export function MessagesView() {
  return (
    <section className="hud-frame p-6">
      <h2 className="hud-title text-primary mb-2">[ MSG ]</h2>
      <p className="hud-mono text-sm text-muted-foreground">
        消息中心 · Phase 4f 实装
      </p>
    </section>
  )
}
```

写入 `src/features/settings/settings-view.tsx`：

```tsx
export function SettingsView() {
  return (
    <section className="hud-frame p-6">
      <h2 className="hud-title text-primary mb-2">[ SETTINGS ]</h2>
      <p className="hud-mono text-sm text-muted-foreground">
        设置 · Phase 4a 实装
      </p>
    </section>
  )
}
```

- [ ] **Step 3: 创建路由表**

写入 `src/app/routes.tsx`：

```tsx
import { Navigate, Route, Routes } from 'react-router'
import { LogsView } from '@/features/logs/logs-view'
import { Top20View } from '@/features/top20/top20-view'
import { OldFriendsView } from '@/features/old-friends/old-friends-view'
import { MessagesView } from '@/features/messages/messages-view'
import { SettingsView } from '@/features/settings/settings-view'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/logs" replace />} />
      <Route path="/logs" element={<LogsView />} />
      <Route path="/top20" element={<Top20View />} />
      <Route path="/old-friends" element={<OldFriendsView />} />
      <Route path="/messages" element={<MessagesView />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="*" element={<Navigate to="/logs" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 4: 改造 App.tsx 装配一切**

用下面完整内容覆盖 `src/App.tsx`：

```tsx
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
```

- [ ] **Step 5: 启动 dev 手动验证全部 5 个路由**

```bash
pnpm dev
```

浏览器打开 http://localhost:5173/，验证：
1. 默认重定向到 `/logs`，显示 "[ LOGS ]" 占位
2. 点击 Nav 里的 TOP 20、OLD FRIENDS、MSG、SETTINGS，URL 和页面内容相应切换
3. 激活的 Tab 背景色为青色半透明，未激活为灰色
4. Header 右上角主题切换按钮：点击循环 system → light → dark → system，页面背景/前景色切换正确
5. 手动访问 http://localhost:5173/not-exist，应重定向到 `/logs`

Ctrl+C 停止。

- [ ] **Step 6: typecheck + test 通过**

```bash
pnpm typecheck && pnpm test
```

期望：typecheck 0 error，测试全绿（cn 的 6 个）。

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: 接入 React Router v7 + 5 个占位视图 + 主题切换"
```

---

## Task 9: Vitest 完整配置 + App 烟雾测试

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/vitest.config.ts`（覆盖 Task 4 临时版本）
- Create: `/Users/wh0am1i/FmoDeck/tests/setup.ts`
- Create: `/Users/wh0am1i/FmoDeck/tests/app.test.tsx`
- Modify: `package.json`（添加 testing-library 依赖）

- [ ] **Step 1: 安装 React Testing Library**

```bash
pnpm add -D @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14
```

- [ ] **Step 2: 用完整配置覆盖 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    css: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

- [ ] **Step 3: 创建 tests/setup.ts**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/tests
```

写入 `tests/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'

// jsdom 不实现 matchMedia，ThemeProvider 会调用。提供最小 stub。
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  })
}
```

- [ ] **Step 4: 创建 App 烟雾测试**

写入 `tests/app.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/App'

describe('App 烟雾测试', () => {
  it('默认渲染 LOGS 视图', () => {
    render(<App />)
    expect(screen.getByText('[ LOGS ]')).toBeInTheDocument()
  })

  it('Header 显示应用标识和版本', () => {
    render(<App />)
    expect(screen.getByText('[ FMODECK ]')).toBeInTheDocument()
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })

  it('Nav 包含 5 个路由 tab', () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: '主导航' })
    expect(nav).toHaveTextContent('LOGS')
    expect(nav).toHaveTextContent('TOP 20')
    expect(nav).toHaveTextContent('OLD FRIENDS')
    expect(nav).toHaveTextContent('MSG')
    expect(nav).toHaveTextContent('SETTINGS')
  })

  it('点击 TOP 20 tab 切换视图', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('link', { name: 'TOP 20' }))
    expect(screen.getByText('[ TOP 20 ]')).toBeInTheDocument()
  })

  it('SpeakingBar 占位渲染', () => {
    render(<App />)
    expect(screen.getByLabelText('讲话状态栏')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: 运行所有测试**

```bash
pnpm test
```

期望：11 个测试全部通过（6 个 cn 单测 + 5 个 App 烟雾测试）。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: 配置 Vitest + jsdom 和 App 烟雾测试"
```

---

## Task 10: ESLint 9 + Prettier

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/eslint.config.js`
- Create: `/Users/wh0am1i/FmoDeck/.prettierrc`
- Create: `/Users/wh0am1i/FmoDeck/.prettierignore`

- [ ] **Step 1: 安装依赖**

```bash
pnpm add -D \
  eslint@^9 \
  @eslint/js@^9 \
  typescript-eslint@^8 \
  eslint-plugin-react@^7 \
  eslint-plugin-react-hooks@^5 \
  eslint-plugin-react-refresh@^0.4 \
  globals@^15 \
  prettier@^3 \
  eslint-config-prettier@^9
```

- [ ] **Step 2: 创建 eslint.config.js（flat config）**

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'src/components/ui'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      react: { version: 'detect' }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  prettier
)
```

> 注：`tseslint.configs.recommendedTypeChecked` 必须通过 `extends` 嵌在 `files: ['**/*.{ts,tsx}']` 配置块里，否则会意外应用到 `.js` 文件（如 `eslint.config.js` 本身），导致 parserOptions.project 报错。

> 注：shadcn 生成的 `src/components/ui/*` 被显式忽略（shadcn 代码风格不完全匹配我们的 lint 规则，且它是 vendor-style 代码）。

- [ ] **Step 3: 创建 .prettierrc**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 4: 创建 .prettierignore**

```
node_modules
dist
build
coverage
pnpm-lock.yaml
src/components/ui
```

- [ ] **Step 5: 运行 lint 和 format 检查**

```bash
pnpm format
pnpm lint
```

`pnpm format` 应重写所有文件符合 Prettier 规则。`pnpm lint` 应 0 error（允许 warning）。

若出现 lint error，按提示逐个修复（常见：`@typescript-eslint/consistent-type-imports` 要求 `import type { X }`）。

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: 配置 ESLint 9 flat config 和 Prettier"
```

---

## Task 11: vite-plugin-checker（开发时 TS 错误即时提示）

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`（新 devDependency）

- [ ] **Step 1: 安装**

```bash
pnpm add -D vite-plugin-checker@^0.9
```

- [ ] **Step 2: 更新 vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import checker from 'vite-plugin-checker'
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
```

- [ ] **Step 3: 启动 dev 验证 checker 工作**

```bash
pnpm dev
```

在任意 `.tsx` 文件里故意写错（例如 `const x: number = 'str'`），浏览器应弹出 overlay 错误提示；保存正确内容后应自动恢复。验证后回退故意错误。Ctrl+C 停止。

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "build: 接入 vite-plugin-checker 开发期类型和 lint 检查"
```

---

## Task 12: GitHub Actions CI

**Files:**
- Create: `/Users/wh0am1i/FmoDeck/.github/workflows/ci.yml`

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/.github/workflows
```

- [ ] **Step 2: 写入 ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    name: Lint · Typecheck · Test · Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Format check
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

- [ ] **Step 3: 本地全流程验证（模拟 CI）**

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

期望：每一步都成功，最终在 `dist/` 生成构建产物。

- [ ] **Step 4: 检查构建产物大小**

```bash
du -sh dist/ && ls -lh dist/assets/
```

记录首屏 JS chunk gzip 大小（验收标准：gzip 后 ≤ 300KB，不含 sql.js wasm 因本阶段还未引入）。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "ci: 添加 GitHub Actions 工作流（lint/typecheck/test/build）"
```

---

## Task 13: README 扩充 + 最终验证

**Files:**
- Modify: `/Users/wh0am1i/FmoDeck/README.md`

- [ ] **Step 1: 用下面完整内容覆盖 README.md**

```markdown
# FmoDeck

业余无线电 FMO 平台的下一代日志与控制台 · 战术 HUD 主题 · React + TypeScript 重写版

前身是 [FmoLogs](../FmoLogs)（Vue 3）。本仓库承载完整重写，分阶段推进。

## 设计文档

- [迁移总设计](docs/superpowers/specs/2026-04-16-fmodeck-migration-design.md)

## 实施计划

- [Phase 1 · 地基](docs/superpowers/plans/2026-04-16-phase-1-foundation.md)（本阶段）

## 技术栈

- **构建**：Vite 7 · TypeScript 5.7+ strict
- **UI**：React 19 · React Router v7 · Tailwind CSS v4 · shadcn/ui · Radix
- **测试**：Vitest 2 · jsdom · @testing-library/react
- **质量**：ESLint 9（flat config）· Prettier 3 · vite-plugin-checker
- **CI**：GitHub Actions

未来阶段将引入：Zustand（状态）· sql.js + IndexedDB（存储）· crypto-js（APRS 签名）。

## 开发

前置：Node ≥ 20.19 · pnpm ≥ 9

```bash
pnpm install    # 安装依赖
pnpm dev        # 本地开发（http://localhost:5173）
pnpm build      # 生产构建（输出到 dist/）
pnpm preview    # 预览构建产物
pnpm test       # 运行测试
pnpm test:watch # 监视测试
pnpm typecheck  # 类型检查
pnpm lint       # ESLint 检查
pnpm lint:fix   # ESLint 自动修复
pnpm format     # Prettier 格式化
pnpm format:check # Prettier 检查
```

## 路由

- `/logs` — QSO 日志（默认）
- `/top20` — 排行榜
- `/old-friends` — 老朋友
- `/messages` — 消息中心
- `/settings` — 设置

所有视图当前为占位，业务实装在 Phase 4 的子阶段逐步落地。

## HUD 主题

冷蓝 `#00D9FF` 为主调，琥珀 `#FFB000` 为警戒色，品红 `#FF3E5C` 为危险色。支持 light / dark / system 三档（右上角切换）。装饰强度通过 CSS 变量 `--hud-intensity` 控制。

## 许可证

同原 FmoLogs，待补。
```

- [ ] **Step 2: 手动最终验证（端到端）**

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

浏览器打开 preview 地址（通常 http://localhost:4173/），逐项验证：

**必过清单**：
- [ ] 默认重定向到 `/logs`，显示 "[ LOGS ]"
- [ ] 5 个 Nav 链接点击切换路由正确
- [ ] Header 右上角主题切换：system → light → dark → system 循环，背景色真实切换
- [ ] 刷新后主题保留（localStorage `fmodeck-theme` 生效）
- [ ] SpeakingBar 占位渲染
- [ ] 访问未知路由（如 `/nope`）重定向到 `/logs`
- [ ] HUD 视觉元素生效：四角定位符（`hud-frame`）、聚焦态霓虹描边、等宽数字、深紫黑背景

Ctrl+C 停止 preview。

- [ ] **Step 3: Final Commit**

```bash
git add .
git commit -m "docs: 完善 Phase 1 README 并通过端到端验证"
```

- [ ] **Step 4: 查看历史**

```bash
git log --oneline
```

期望看到完整的 Phase 1 commit 链，从"初始化 pnpm 项目"到"完善 Phase 1 README"。

---

## Phase 1 完成验收

对照设计文档 §7 整体验收标准（Phase 1 相关子集）：

- ✅ `pnpm typecheck` 0 error（strict 模式）
- ✅ `pnpm test` 全绿（cn 6 个 + App 5 个 = 11 个测试）
- ✅ `pnpm build` 产物能 `pnpm preview`，所有路由访问正常
- ✅ 首屏 bundle gzip 后 ≤ 300KB（Phase 1 范围内，不含 sql.js wasm）
- ✅ dark mode 完整支持（system/light/dark 三档，localStorage 持久）
- ✅ HUD 主题视觉锚点初见雏形（color token、hud-frame、hud-glow 等 utilities 可用）
- ✅ GitHub Actions CI 配置到位（推送后将触发全流程检查）

Phase 1 结束后即可进入 Phase 2 的 brainstorm + 实施计划编写。
