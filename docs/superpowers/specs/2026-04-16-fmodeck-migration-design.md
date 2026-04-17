# FmoDeck — FmoLogs 迁移至 React + TS 的设计文档

**日期**：2026-04-16
**原项目**：FmoLogs（Vue 3 + Vite + JavaScript）
**新项目**：FmoDeck（独立新仓库）
**目标栈**：Vite + React + TypeScript + React Router + Zustand + Tailwind + shadcn/ui
**UI 主题**：战术 HUD（Tactical HUD）
**迁移策略**：一份统一设计 + 分阶段实施计划

---

## 目标与动机

把 FmoLogs 从 Vue 3 + JavaScript 迁移到 React + TypeScript，同时：

1. 引入类型安全（TS strict 模式），消除运行时类型错误
2. 完整重构 UI 为战术 HUD 风格（非 1:1 视觉移植）
3. 为核心纯逻辑层（ADIF 解析、APRS 签名、存储抽象、DB 查询）建立单元测试
4. 修掉现项目已知架构隐患（请求 key 碰撞、CDN 依赖 wasm、无 reqId 匹配）
5. 在保留全部现有功能的前提下，新增一个实时讲话增强信息卡功能

这是**栈迁移 + UI 重构 + 小幅功能增量**。**不做**服务端化、不做桌面应用、不做 PWA、不做多语言、不做云同步。

---

## 决策汇总

| 维度       | 决定                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 技术栈     | Vite 7 + React 19 + TypeScript 5.x（strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes） |
| 路由       | React Router v7                                                                                      |
| 状态管理   | Zustand（全局 + feature 切片）                                                                       |
| 样式       | Tailwind CSS v4                                                                                      |
| 组件库     | shadcn/ui + Radix（组件代码 own 在项目内）                                                           |
| 数据层     | sql.js（浏览器端 SQLite）+ IndexedDB 持久化 — **保持现状**                                           |
| 加密       | crypto-js（APRS HMAC-SHA1）— **保留**，不改 Web Crypto                                               |
| 包管理器   | pnpm                                                                                                 |
| Node 版本  | ≥ 20.19                                                                                              |
| 浏览器目标 | 现代 evergreen（Chrome/Edge/Firefox/Safari 近两年）                                                  |
| 国际化     | 中文 only，不引入 i18n 库                                                                            |
| 测试       | Vitest（仅覆盖 `lib/*` 纯逻辑层）                                                                    |
| 部署       | 静态网页（`dist/` 直接托管）                                                                         |
| PWA        | 不做 Service Worker（IndexedDB 已提供持久化）                                                        |
| 功能范围   | 与现有 FmoLogs 1:1 对齐 + 新增"SpeakingBar 实时讲话增强信息卡"                                       |
| UI 风格    | 战术 HUD（Tactical HUD），中度强度                                                                   |
| 分解策略   | 统一设计 + 4 个实施阶段（Phase 1–4），Phase 4 再细分子阶段                                           |
| 新仓库名   | `FmoDeck`（独立新仓，旧仓 `FmoLogs` 迁移期仅接受紧急修复）                                           |

---

## § 1 · 目标架构总览

### 1.1 目录结构

```
FmoDeck (Vite + React 19 + TS strict)
│
├── app/                     路由 / 页面入口
│   ├── App.tsx              根组件（Router + Providers）
│   ├── routes.tsx           路由表
│   └── providers/           ToastProvider、ConfirmProvider、ThemeProvider
│
├── features/                按业务模块组织（垂直切片）
│   ├── logs/                QSO 日志视图
│   ├── top20/               排行榜
│   ├── old-friends/         老朋友
│   ├── messages/            消息中心
│   ├── aprs/                APRS 远控
│   ├── station/             当前电台 / 切换
│   └── settings/            设置
│   每个 feature 内部结构：
│   ├── components/          该功能私有 UI
│   ├── store.ts             该功能的 Zustand store
│   ├── hooks.ts             该功能的自定义 hooks
│   └── types.ts             该功能的 TS 类型
│
├── lib/                     框架无关的纯逻辑层（Phase 2 主攻）
│   ├── fmo-api/             FMO WebSocket 客户端
│   ├── message-service/     Message WS 客户端
│   ├── aprs/                APRS 协议（签名、计数器、数据包构造）
│   ├── adif/                ADIF 解析 / 格式化（UTF-8 字节感知）
│   ├── storage/             IndexedDB 抽象 + sql.js 加载
│   ├── db/                  QSO 数据库操作（SQL 查询封装）
│   └── utils/               URL 规范化、呼号校验等
│
├── components/              跨 feature 的共享 UI
│   ├── ui/                  shadcn 组件
│   ├── layout/              AppShell / Header / Nav / SpeakingBar
│   └── common/              DatePicker / CallsignBadge / StatusDot 等
│
├── stores/                  跨 feature 的全局 store
│   ├── connection.ts        FMO 连接状态、当前地址
│   ├── speaking.ts          当前讲话状态 + 讲话者统计 LRU 缓存
│   └── settings.ts          全局设置
│
├── types/                   跨 feature 的共享类型
│   ├── qso.ts               QSO 记录类型
│   ├── station.ts
│   └── fmo-protocol.ts      WebSocket 协议 type/subType 穷举
│
└── tests/                   Vitest 测试（仅 lib/ 下的纯逻辑）
```

### 1.2 关键边界

- **`lib/` 纯 TS、框架无关、可独立测试** — Phase 2 做完这层，React 层尚未开始就已有质量保障
- **`features/` 垂直切片** — 每个业务模块自成一体，避免 Vue 项目里 composables/components/views 三处跳转
- **`components/ui`（shadcn）vs `components/common`（业务共享）vs `features/*/components`（功能私有）** — 三层分离，避免"万能 components 文件夹"

---

## § 2 · 数据流 / 状态层

### 2.1 状态分层

| 层级          | 技术                      | 示例                                     | 生命周期     |
| ------------- | ------------------------- | ---------------------------------------- | ------------ |
| UI 局部状态   | `useState` / `useReducer` | 模态框开关、输入框内容、分页当前页       | 组件挂载期   |
| Feature store | Zustand（feature 内）     | `logs.store.ts` 管日志查询结果与过滤条件 | app 生命周期 |
| 全局 store    | Zustand（`stores/`）      | 连接状态、当前电台、讲话状态             | app 生命周期 |
| 持久状态      | IndexedDB + sql.js        | 地址列表、APRS 服务器、QSO 数据库        | 跨会话       |

### 2.2 Zustand store 模板

```ts
// features/aprs/store.ts
interface AprsState {
  // 状态
  wsConnected: boolean
  wsConnecting: boolean
  history: AprsHistoryEntry[]
  currentServerId: string
  // ...

  // 动作
  connect: (opts?: { testOnly?: boolean }) => Promise<void>
  disconnect: () => void
  sendCommand: (action: AprsAction) => Promise<void>
  selectServer: (id: string) => void
}

export const useAprsStore = create<AprsState>((set, get) => ({
  wsConnected: false,
  // ...
  connect: async (opts) => {
    /* ... */
  }
}))

// selectors（派生状态，替代 Vue 的 computed）
export const useCanSend = () =>
  useAprsStore((s) => !s.sending && isValidCallsign(s.mycall) && isValidSecret(s.secret))
```

**强制规范**：所有组件只能用 selector 订阅（`useStore(s => s.field)`），禁止 `useStore()` 订阅整 store —— 避免过度渲染。

### 2.3 Vue → React 映射

| Vue                                                 | React                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| 模块级 `const x = ref(null)` + `useXxx()` hook 返回 | Zustand store（state + actions 同对象）                           |
| 组件内 `ref()`                                      | `useState`                                                        |
| `computed(() => ...)`                               | Zustand selector hook / 组件内 `useMemo`                          |
| `watch(x, fn)`                                      | `useEffect(fn, [x])`                                              |
| `provide/inject`                                    | Context Provider（仅用于 Theme/Toast/Confirm 这类跨层 UI 关注点） |

### 2.4 WebSocket 客户端与 store 解耦

```ts
// lib/fmo-api/client.ts —— 纯 TS，无 React 依赖
export class FmoApiClient {
  onSpeakingChange(cb: (status: SpeakingStatus) => void): Unsubscribe
  async getQsoList(page: number, pageSize: number, fromCallsign?: string): Promise<QsoListResponse>
  // ...
}

// stores/connection.ts —— Zustand，持有单例 client
export const useConnectionStore = create<ConnectionState>((set) => {
  const client = new FmoApiClient(/* baseUrl */)
  client.onSpeakingChange((status) => useSpeakingStore.setState({ status }))
  return { client /* ... */ }
})
```

- 协议层在 `lib/` 里做单元测试（mock `WebSocket` 全局）
- store 只管 React 层状态和副作用桥接
- feature 组件通过 store 取数，不直接碰 `client`

### 2.5 请求/响应匹配改进（修掉现有隐患）

现有 `FmoApiClient.handleMessage` 用 `type:subType` 作 key，同 key 并发会覆盖第一个请求。

**乐观方案**：引入 `reqId`（`nanoid()`）

```ts
const reqId = nanoid()
socket.send(JSON.stringify({ type, subType, reqId, data }))
pendingRequests.set(reqId, { resolve, reject, timeoutId })

// 收到响应
const pending = pendingRequests.get(msg.reqId)
if (pending) {
  /* resolve/reject */
}
```

**兜底方案**：设备不回显 reqId 则回退为"同 key 请求串行队列"。

Phase 2 开发 `FmoApiClient` 时**首日做实机验证**决定走哪条路。

---

## § 3 · 迁移阶段详细分工

### Phase 1 · 地基（单 PR 可完成）

**目标**：空壳但可跑，确立所有基础设施。

**产出**：

- Vite 7 + React 19 + TypeScript 5.x（strict 模式 + 严格选项）
- Tailwind CSS v4 配置（`@theme` inline + dark mode via `class` strategy）
- shadcn/ui 初始化 + 必备组件（Button / Dialog / Input / Select / Toast / Dropdown / Popover / Tooltip）
- React Router v7（路由表骨架：`/logs`, `/top20`, `/old-friends`, `/messages`, `/settings`，占位页）
- `AppShell` 布局（Header + Nav + Main + 占位 SpeakingBar）
- 战术 HUD 主题基础（Tailwind theme tokens、字体、基础组件视觉）
- 暗色模式（`ThemeProvider` + CSS 变量 + `prefers-color-scheme` 跟随 + 手动切换）
- Vitest 配置（jsdom 环境）
- ESLint 9 + Prettier + `eslint-plugin-react` + `@typescript-eslint`
- `vite-plugin-checker`（开发时 TS 错误即时提示）
- CI 基础（GitHub Actions：lint + typecheck + test + build）
- README（开发 / 构建 / 测试命令）

**验收**：`pnpm dev` 能看到空壳应用，5 个路由切换正常，dark mode 切换工作，HUD 主题初见雏形。

**不包含**：业务逻辑、WebSocket、sql.js 任何实际集成。

---

### Phase 2 · 纯逻辑层（`lib/*`）+ 类型定义

**目标**：框架无关的 TS 库，关键模块单元测试覆盖。

| 模块                                         | 内容                                                   | 测试                       |
| -------------------------------------------- | ------------------------------------------------------ | -------------------------- |
| `types/fmo-protocol.ts`                      | 所有 `type/subType` 消息的 discriminated union TS 类型 | —                          |
| `types/qso.ts` / `station.ts` / `message.ts` | 业务实体类型                                           | —                          |
| `lib/utils/url.ts`                           | `normalizeHost`、地址校验                              | ✅                         |
| `lib/utils/callsign.ts`                      | 呼号+SSID 解析、校验（`^B[A-Z][0-9][A-Z]{2,3}$`）      | ✅                         |
| `lib/aprs/signing.ts`                        | HMAC-SHA1 签名、时间槽计算                             | ✅（固定 I/O 比对）        |
| `lib/aprs/counter.ts`                        | localStorage 计数器（带时间槽重置）                    | ✅（mock localStorage）    |
| `lib/aprs/packet.ts`                         | APRS 数据包构造                                        | ✅                         |
| `lib/adif/parser.ts`                         | ADIF 解析（UTF-8 字节感知）                            | ✅（含中文样本）           |
| `lib/adif/formatter.ts`                      | ADIF 格式化                                            | ✅（回环测试）             |
| `lib/storage/indexeddb.ts`                   | IndexedDB 抽象                                         | ✅（fake-indexeddb）       |
| `lib/db/sql-loader.ts`                       | sql.js wasm 加载                                       | 冒烟测试                   |
| `lib/db/qso-queries.ts`                      | QSO SQL 查询封装（含新功能 `getCallsignStats`）        | ✅（内存 sql.js）          |
| `lib/fmo-api/client.ts`                      | FmoApiClient（含 reqId 优化或串行队列回退）            | 冒烟测试（mock WebSocket） |
| `lib/message-service/client.ts`              | MessageService                                         | 冒烟测试                   |

**APRS 测试 baseline**：用现 Vue 项目的已知输入/输出对作为 fixture 校验，防签名算法回归。

**ADIF 测试 baseline**：用用户实际数据脱敏子集做回环测试（解析→格式化→再解析 == 原值），重点覆盖中文字段的 UTF-8 字节长度处理。

**验收**：`pnpm test` 全绿，`lib/*` 可独立导入使用，无任何 React 引用。

---

### Phase 3 · 状态层 + hooks

**目标**：把 `lib/` 包装成 React 可用的 store/hook。

**产出**：

| Store                           | 职责                                                    |
| ------------------------------- | ------------------------------------------------------- |
| `stores/connection.ts`          | FMO 连接（持有 `FmoApiClient` 单例）、当前地址、协议    |
| `stores/speaking.ts`            | 讲话状态 + 历史 + **讲话者统计 LRU 缓存（最近 20 位）** |
| `stores/settings.ts`            | 全局设置（呼号、协议、多选模式等）                      |
| `features/logs/store.ts`        | 日志查询 / 过滤 / 分页                                  |
| `features/top20/store.ts`       | Top20 统计缓存                                          |
| `features/old-friends/store.ts` | 老朋友列表                                              |
| `features/messages/store.ts`    | 消息列表 / 分页 / 未读                                  |
| `features/aprs/store.ts`        | APRS 状态（全量迁移 `useAprsControl` 逻辑）             |
| `features/station/store.ts`     | 当前电台 / 切换                                         |

**hooks**：`useFmoSync()`, `useAutoReconnect()`, `useConfirm()`, `useToast()`

**验收**：store 可通过开发者工具直接调用方法触发同步，控制台验证数据流通。此阶段仍无 UI（仅日志打印）。

---

### Phase 4 · 视图（按模块独立 PR）

**目标**：HUD 主题下的 UI 重构，逐个模块落地。每个子阶段独立 PR、独立 review、独立合并。

| 子阶段 | 模块                                      | 依赖                               | 预估规模                         |
| ------ | ----------------------------------------- | ---------------------------------- | -------------------------------- |
| 4a     | **Settings + Connection**                 | stores/settings, stores/connection | 中（连接配置是所有功能前置）     |
| 4b     | **Logs 视图**                             | features/logs                      | 大（搜索、过滤、分页、详情）     |
| 4c     | **SpeakingBar（含新功能）+ Station 切换** | stores/speaking, features/station  | **中**（原"小"因新功能升级为中） |
| 4d     | **Top20**                                 | features/top20                     | 中                               |
| 4e     | **Old Friends**                           | features/old-friends               | 中                               |
| 4f     | **Messages**                              | features/messages                  | 中                               |
| 4g     | **APRS 远控**                             | features/aprs                      | 大（表单 + 历史 + 服务器管理）   |
| 4h     | **DB 导入导出 + ADIF 导入导出**           | lib/adif, lib/db                   | 中                               |

**每个 4x 子阶段的实施计划在 Phase 3 完成后单独 brainstorm 并产出**（本文档不锁 UI 细节）。

---

### 阶段间依赖关系

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4a
                   ├──▶ (可部分并行)      │
                   │                      ├──▶ 4b / 4c / 4d / 4e / 4f / 4g / 4h
                   │                      │    (彼此独立，可并行或按优先级)
Phase 1 ─────────────────────────────────┘ (4a 依赖 Phase 3 完成)
```

**优先级指引**：

- Phase 2 的类型定义可以与 Phase 1 少量重叠
- Phase 4 的 4b/4d/4e/4f/4g/4h 互相独立，可并行或按兴趣排序；4c 含新功能建议靠前排

---

## § 4 · 新功能：SpeakingBar 实时讲话增强信息卡

### 4.1 需求

当 FMO 中继上某呼号开始讲话时，在顶部 SpeakingBar 内联展示该呼号与当前电台的历史通联统计，帮助 OP 立即识别熟识度。**无需点击交互**，所有信息直接可见。

### 4.2 显示内容

| 展示     | 格式                                                                 | 数据源                  |
| -------- | -------------------------------------------------------------------- | ----------------------- |
| 通联次数 | `QSO×12` 等宽数字                                                    | `SELECT COUNT(*)`       |
| 最后通联 | 相对时间：`LAST 3d ago` / `LAST 2mo ago` / `FIRST MEET`              | `SELECT MAX(timestamp)` |
| 徽章     | 🆕 新联络人（0 次）/ ⭐ 熟人（5-19）/ 💎 老朋友（≥20）；1-4 次无徽章 | 派生                    |

**阈值**：5 / 20（后续可在设置中调整）。当前 OldFriends 视图无阈值，不冲突。

### 4.3 数据路径

```
FMO WebSocket 推送讲话事件
  ↓
stores/speaking.ts 接收 onSpeakingChange
  ↓
若呼号变化（旧 ≠ 新）→ 防抖 300ms
  ↓
检查 LRU 缓存（最近 20 位）
  ├─ 命中 → 直接用缓存
  └─ 未命中 → 调用 lib/db/qso-queries.ts 的 getCallsignStats(callsign)
              ↓
              SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
              FROM qso WHERE fromCallsign = ? AND toCallsign = ?
              ↓
              写入 LRU 缓存
  ↓
更新 speaking store 的 currentSpeakerStats
  ↓
SpeakingBar 组件通过 selector 订阅，渲染徽章
```

### 4.4 性能兜底

- **原生 SQL 聚合**（非现项目的 JS 内存分组），大数据量下性能稳定
- **LRU 缓存最近 20 位讲话者** — 同呼号反复讲话不重复查询
- **300ms 防抖** — 快速讲话切换只触发一次查询；真实讲话事件频率 Phase 4c 实装时校准

### 4.5 归属阶段

- Phase 2：在 `lib/db/qso-queries.ts` 加 `getCallsignStats({ fromCallsign, toCallsign })` 查询（返回 `{ count, firstTime, lastTime }`） + 单测
- Phase 3：在 `stores/speaking.ts` 集成 LRU 缓存 + 防抖 + 自动触发
- Phase 4c：SpeakingBar 组件承载 UI（HUD"目标锁定卡"视觉范式）

---

## § 5 · UI 设计方向：战术 HUD（Tactical HUD）

### 5.1 气质定位

- **参考**：钢铁侠 Jarvis / 军用雷达屏 / 战斗机座舱 / 塔台显示器
- **域契合**：业余无线电本质是通讯协议 + 实时信号数据，HUD 语言是同根文化
- **反面对照**：避免 Apple 消费品风、避免圆角柔和、避免大块渐变装饰

### 5.2 视觉元素

| 元素       | 做法                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| 形状       | 锐角矩形 / 梯形切角；**无圆角或极小圆角（≤2px）**                                                                        |
| 边框       | 细双线 1px + 0.5px 间隙；四角带 `┌┐└┘` 定位符                                                                            |
| 字体       | 标题：大写 sans-serif（如 `Inter` 加 `letter-spacing`）；正文：等宽 mono（如 `JetBrains Mono`）；数字强制 `tabular-nums` |
| 背景       | 深紫黑 + 0.03 透明度栅格底纹 + 可选噪点层                                                                                |
| 色系       | 主：冷蓝 `#00D9FF` / 警戒：琥珀 `#FFB000` / 危险：品红 `#FF3E5C` / 中性文本：白灰 `#E0E7EF`                              |
| 聚焦态     | 霓虹描边 + 弱辉光（`box-shadow: 0 0 8px`）                                                                               |
| 动效       | 顶部扫描线（可关）、数据进出 typewriter 逐字（可关）、按钮 hover 微 glitch                                               |
| 数据可视化 | 进度条用阶梯格（`█ █ █ ▒ ░`）而非连续条；状态点用 `● ◉ ○`                                                                |

### 5.3 强度策略

选中度（Medium）强度。所有装饰效果由 CSS 变量控制：

```css
:root {
  --hud-intensity: 1; /* 0-1 总强度开关 */
  --hud-scanline-opacity: 0.05; /* 扫描线透明度 */
  --hud-glitch-duration: 0.3s; /* glitch 动效时长 */
}
```

轻/中/重三档通过修改 token 实现，不需要重写组件。设置面板可提供开关。

### 5.4 shadcn 兼容性

**不 fork** shadcn 组件源码。通过：

1. Tailwind theme token 重写（`colors`, `radius`, `boxShadow`, `fontFamily`）
2. 全局 CSS 覆盖 `focus-visible`, `::selection`, `scrollbar`
3. 组件 `className` prop 处追加 HUD 装饰类（`data-hud-frame`, `data-hud-glow`）

无障碍特性（focus trap、键盘导航、ARIA）由 Radix 提供，HUD 视觉层不干扰这些。

### 5.5 SpeakingBar HUD 范式

新功能的"目标锁定卡"视觉（示意）：

```
┌─[ BG7XYZ ]────────────┐   ⬢ NOW TALK
│ QSO×12 · LAST 3d ago  │   ● ACTIVE
│ ⭐ FAMILIAR           │   ▲ SIG -62dBm
└───────────────────────┘
```

左侧呼号 + 中部统计栏（等宽跳动）+ 右侧状态灯。呼号切换时用 typewriter 动效。

> 注：`▲ SIG -62dBm` 为 HUD 装饰元素示意；实际信号强度字段是否展示取决于 FMO 协议是否提供，若无则该行替换为其他 HUD 装饰（如时间戳 / 信道号）或删去。

---

## § 6 · 关键技术决策 / 待议项 / 风险

### 6.1 需实施时做联调验证的点

1. **FMO WebSocket 的 `reqId` 支持** — Phase 2 首日实机验证，不支持则回退串行队列
2. **sql.js wasm 本地捆绑体积** — ~1.2MB，默认静态打包；影响首屏则改动态 import + Suspense
3. **IndexedDB 存储配额** — 大型 .db 文件（>50MB）导入前 `navigator.storage.estimate()` 预检
4. **讲话事件防抖阈值** — 300ms 是估算值，Phase 4c 依据真实讲话事件频率校准

### 6.2 已知风险 + 缓解

| 风险                                 | 影响               | 缓解                                                                       |
| ------------------------------------ | ------------------ | -------------------------------------------------------------------------- |
| UI 重设计偏离 — HUD 各模块风格不统一 | Phase 4 工作量膨胀 | 本文档不锁 UI 细节；Phase 4 每子阶段先独立 brainstorm；主题 token 统一收口 |
| Vue→React 响应式心智差异 — 过度渲染  | 性能、卡顿         | 全项目统一 selector pattern；禁用整 store 订阅                             |
| ADIF UTF-8 字节处理回归              | 中文字段损坏       | Phase 2 单测放中文样本做回环测试                                           |
| APRS HMAC 签名算法错误               | 设备拒收控制指令   | Phase 2 单测用现 Vue 项目 I/O 对做 baseline 比对                           |
| 迁移期旧项目 vs 继续维护             | 分心 / 双份工作    | 迁移期 FmoLogs 仅接紧急修复；新功能只入 FmoDeck                            |
| 讲话统计查询频繁触发卡顿             | SpeakingBar 卡顿   | LRU 缓存 + 300ms 防抖（§4.4）                                              |
| shadcn 默认风格与 HUD 冲突           | 视觉不纯           | 通过 Tailwind theme + 全局 CSS 覆盖实现，不 fork 组件源码                  |

### 6.3 明确不做的事（YAGNI）

- ❌ SSR / RSC / Next.js
- ❌ API Routes / 服务端
- ❌ 多用户 / 账号系统 / 权限
- ❌ 云端数据同步
- ❌ 桌面应用（Tauri/Electron）— 作为后续独立项目
- ❌ PWA Service Worker
- ❌ 多语言 i18n
- ❌ E2E 测试（Playwright）
- ❌ Redux DevTools 深度集成 / 时光回溯
- ❌ Storybook

### 6.4 修掉的现有隐患

| 现隐患                                              | 新方案                                               |
| --------------------------------------------------- | ---------------------------------------------------- |
| `FmoApiClient.handleMessage` 同 key 请求覆盖        | reqId 匹配（兜底：串行队列）                         |
| `station.getListRange → getListResponse` 字符串特判 | 在 `fmo-protocol.ts` 用 discriminated union 显式映射 |
| sql.js wasm 依赖 `cdn.lzyike.cn` CDN                | 本地 Vite 静态资源捆绑                               |
| `getOldFriendsFromIndexedDB` 用 JS 内存聚合         | 改原生 SQL `GROUP BY`                                |
| 0 测试                                              | lib/ 层关键纯逻辑全覆盖单测                          |
| 无类型                                              | TS strict，全项目类型安全                            |

---

## § 7 · 整体验收标准

- ✅ 所有 Phase 2 模块的单元测试 `pnpm test` 全绿
- ✅ `pnpm typecheck` 0 error（strict 模式）
- ✅ `pnpm build` 产物能静态托管，所有路由访问正常
- ✅ 现有 FmoLogs 所有功能在新版可用（人工过清单）
- ✅ 新功能 SpeakingBar 实时讲话增强信息卡工作正常
- ✅ 首屏 bundle gzip 后 ≤ 300KB（不含 sql.js wasm）
- ✅ dark mode 完整支持（`prefers-color-scheme` 自动 + 手动切换）
- ✅ HUD 主题视觉一致性达标（跨所有 feature）

---

## § 8 · 下一步

1. 本设计通过 review 后进入 **writing-plans** 阶段，产出 **Phase 1 实施计划**
2. Phase 1 完成后，再 brainstorm 并产出 Phase 2 计划
3. Phase 2 完成后，再 brainstorm 并产出 Phase 3 计划
4. Phase 3 完成后，Phase 4 的每个子阶段 (4a-4h) 独立 brainstorm + 计划 + 实施

每阶段的实施计划在完成上一阶段后再写，避免早锁死的细节在执行时才发现需要调整。
