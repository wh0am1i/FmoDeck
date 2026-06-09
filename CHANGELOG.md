# 变更日志

按阶段汇总。详细提交见 `git log`。

## 起步 · 2026-04-16

从 FmoLogs（Vue 3）完整重写到 FmoDeck（React + TypeScript + HUD 主题）。设计文档见 [docs/superpowers/specs/](docs/superpowers/specs/)，阶段实施计划见 [docs/superpowers/plans/](docs/superpowers/plans/)。

---

## Phase 1 · 地基

Vite 7 + React 19 + TS strict + Tailwind v4 + shadcn/ui + React Router v7 空壳可跑。

- pnpm 项目 + 核心依赖
- Vite / TS 严格模式 / 路径别名 `@/*`
- Tailwind v4 + HUD 主题 CSS 变量（冷蓝 `#00D9FF` / 琥珀 `#FFB000` / 品红 `#FF3E5C`）+ `.hud-frame` / `.hud-glow` / `.hud-mono` / `.hud-title` 工具类
- `cn()` 工具函数（TDD · 6 测试）
- shadcn/ui 8 组件（Button / Dialog / Input / Select / Sonner / DropdownMenu / Popover / Tooltip）
- ThemeProvider（light / dark / system · localStorage 持久化）
- AppShell / Header / Nav / SpeakingBar 占位布局
- 5 路由（`/logs` · `/top20` · `/old-friends` · `/messages` · `/settings`）
- Vitest 3 + jsdom + React Testing Library（11 测试）
- ESLint 9 flat config + Prettier
- vite-plugin-checker 开发期类型/lint 检查
- GitHub Actions CI

## Phase 2a · 纯逻辑层

框架无关 TypeScript 库。

- **Types**：QSO / Station / Message 实体 + FMO 协议 discriminated union
- **`lib/utils/url.ts`**：`normalizeHost`
- **`lib/utils/callsign.ts`**：`parseCallsignSsid` / `formatAddressee` / `isValidChineseCallsign`（中国 BY 呼号正则）
- **`lib/aprs/signing.ts`**：HMAC-SHA1 签名 + 时间槽 · 附 FmoLogs 字节级 fixture 防回归
- **`lib/aprs/counter.ts`**：槽内计数器 · `CounterStorage` 抽象便于测试
- **`lib/aprs/packet.ts`**：APRS 数据包构造
- **`lib/adif/parser.ts`**：UTF-8 字节感知的 ADIF 解析器（Uint8Array 状态机）
- **`lib/adif/formatter.ts`**：格式化器 + 回环测试（含中文 + emoji）

## Phase 2b · I/O 层

带副作用的模块。探测 fmo.local 发现 `reqId` 不支持 → 走串行队列。

- **`lib/storage/indexeddb.ts`**：Promise 包装（fake-indexeddb 单测）
- **`lib/db/sql-loader.ts`**：sql.js 本地 wasm 加载（Node 用 `createRequire` + fs · 浏览器 Vite `?url`）· 不走 CDN
- **`lib/db/qso-queries.ts`**：QSO SQL 查询 + `getCallsignStats` for SpeakingBar
- **`lib/fmo-api/client.ts`**：`FmoApiClient` 串行队列 + 指数退避自动重连
- **`lib/message-service/client.ts`**：消息领域 API 包装 + `onSummary` 推送订阅

## Phase 3a · 连接 + 设置 state 层

Zustand store + React hooks。

- **`stores/settings.ts`**：FMO 地址 CRUD + 呼号 + 协议 · localStorage `fmodeck-settings`
- **`stores/connection.ts`**：`FmoApiClient` 单例 + 4 态状态机（disconnected / connecting / connected / error）
- **`hooks/useFmoSync.ts`**：订阅 settings → 触发 connection.connect/disconnect
- **`hooks/useAutoReconnect.ts`**：薄 hook 读连接状态

## Phase 4a · Settings + Connection UI

UI 闭环：首次配置 → 连上 fmo.local。

- Header `ConnectionIndicator`（UNCONFIGURED / CONNECTING / ONLINE / ERROR 四态）
- Settings 视图：FMO 地址列表（激活 radio + 删除）+ 新增 Dialog（host + 名称）+ 呼号输入（BY 校验）+ 协议 Select（ws / wss）

## Phase 3b（logs）+ 4b · Logs 视图

服务器协议探测 + 完整日志视图。

- **`lib/qso-service/client.ts`**：`getList` + `getDetail` 封装
- **`features/logs/store.ts`**：内存缓存 + 过滤/分页选择器
- **LogsView**：断开占位 · 自动加载 · 刷新按钮 · 过滤（呼号前缀）· 分页（20/页）· 点行懒加载详情 Dialog（10 字段）

## Phase 4f · Messages 视图

- 修 `MessageService.getList` 分页响应（之前误作数组）· 加 `MessagePage` 类型
- **`features/messages/store.ts`**：list + `prependSummary`（推送去重）+ `markRead` + 未读计数
- **MessagesView**：列表（未读左侧青点）+ 详情 Dialog（自动标已读 + 服务器 setRead）+ Compose 撰写 Dialog（BY 呼号校验）
- **推送订阅**：`onSummary` → prepend + toast

## Phase 4g · APRS 远控

- **`lib/aprs-gateway/client.ts`**：单次性 WebSocket（connect → send → response → close）
- **`features/aprs/store.ts`**：参数持久化 · 历史 20 条循环 · `sendCommand` 组合 Phase 2a 签名+计数器+数据包
- **AprsView** `/aprs` 路由：参数表单（密码字段遮蔽）+ 3 指令按钮（NORMAL / STANDBY / REBOOT）+ 历史列表（→/✓/✗ 三色）

## Phase 4c · SpeakingBar 实时讲话增强

- **`lib/fmo-events/client.ts`**：`/events` WebSocket（粘连 JSON 拆分 + 指数退避重连）
- **`features/speaking/store.ts`**：currentSpeaker + history
- **`hooks/useSpeakingEvents.ts`**：订阅 `/events` → speakingStore
- **SpeakingBar 升级**：脉冲青点 + 呼号 + 网格 + HOST 标签 + 讲话时长（每秒刷新）+ 通联统计（count / 上次时间，从 logsStore 聚合）

## Phase 4d · Top20 排行榜

按 `toCallsign` 聚合 · 并列时按最近时间倒序 · `useMemo` 缓存。

## Phase 4e · Old Friends

聚合全部老朋友 · 搜索（包含匹配）+ 分页（20/页）· 响应式表格。

## Phase 4h（部分）· ADIF 导出

Logs 视图加"导出 ADIF"按钮。摘要 → ADIF（`call` / `gridsquare` / `qso_date` / `time_on` UTC）→ 浏览器下载。导入待后续设计 IndexedDB 持久层。

---

## 增强 · 同步模式

`FmoAddress.syncMode: 'all' | 'today' | 'incremental'`（per-address）。

- **`all`**：拉全量替换（默认 · 首次）
- **`today`**：本地时区今天 00:00 起 · 拉回来即终止
- **`incremental`**：基于已有最大 `logId` · 只拉新增并 prepend

UI：添加地址 Dialog 加 3 选项 Radio · 地址列表徽章点击循环切换 · Logs / Top20 / OldFriends 头部显示"今天 · N 条"前缀。

## 修 bug · QSO 全量分页

服务器 `pageSize=20` 固定，之前只拉到 20 条。`QsoService.getListAll` 循环翻页 · `stopAt` 回调支持 today / incremental 的 early-break。实机验证 173 条可全量。

## 增强 · UX 小改

- 添加第一个地址时自动激活（免用户手动切）
- FmoApiClient `RESPONSE_ALIASES` 映射表修 `station/getListRange` → `getListResponse` 匹配
- `StationSubType` 类型补齐 Response 变体

## 增强 · Station 切换

- **`lib/station-service/client.ts`**：`getCurrent` / `getListAll` / `setCurrent` / `next` / `prev`
- **`features/station/store.ts`**：current / list · 切换后自动 `getCurrent` 刷新
- **Header `StationSwitcher` Popover**：Radio 图标 + 当前中继名 → 展开 prev/next/刷新 + 列表（激活高亮 · 点击切换 + toast）

## 增强 · 快速交叉查询

Top20 / OldFriends 条目点击 → `setFilter(callsign)` + `navigate('/logs')`。"发现呼号 → 一键查历史"。

## 增强 · 连接错误横幅

AppShell 顶部 `ConnectionErrorBanner`：`status === 'error'` 时显示 · 消息 + 重试按钮（调 `connect(currentUrl)`）。

## 大改 · 首页 Dashboard v3 值守屏（v0.2.0 · 2026-06-07）

首页整体重做为全屏地图 HUD 值守监控屏。设计 spec / 实施计划见 `docs/superpowers/`。

- **AppShell 双形态**：`/` 路由 `h-dvh` 满屏、不渲染 Header/Nav/Footer；其他页不变。页面切换走首页右上 ☰ 菜单（与 Nav 共用 `NAV_ITEMS`）
- **LocationMap 重写**：常驻实例满屏铺底 · idle/单点/双点视角规则 · fitBounds 不对称 padding 避让浮层 · minZoom 4 + 世界边界 · 深色主题瓦片 CSS 反色"夜图" · 白边虚线连线 + 中点大圆距离标签 · 讲话者无网格时 hold 视角
- **右侧 HUD 信息列**：双时钟（UTC/本地）→ Hero → 名册纵排，`hud-overlay` 半透明浮层统一样式
- **SpeakerHero 升级**：嵌入 StationSwitcher（群组名/切换）· 迷你波形 + 收听控制恒渲染（EMPTY 态可开收听）· LIVE 呼吸辉光
- **讲话名册**：按呼号去重 + ×次数 · roomy 宽松列表形态 · 点击地图聚焦（再点取消 / 新讲话者自动解除）
- **手机横屏适配** + 竖屏旋转提示 · 首页强制深色主题（离开还原）
- **logsStore.loadNew**：qso/history 事件触发增量拉取（logId 去重防并发竞态），今日已联 ⭐/统计实时更新
- 测试 **523 个**全绿 · typecheck / ESLint 0 error 0 warning

## 修复 + 增强 · 移动端体验（v0.2.2 · 2026-06-09）

- **安卓 SSTV 存图/分享**：安卓 WebView 不支持 `<a download>` 与图片剪贴板 → 收到图片无法下载/复制。改用 `tauri-plugin-android-fs`：下载存系统相册（MediaStore + 图库扫描），复制退化为系统分享面板。按 `isAndroid()` 分流，Web/桌面行为不变
- **网页版 PWA**：加 manifest（`display: standalone`）+ PNG 图标 + iOS meta + 最小 Service Worker。手机「添加到主屏幕」后以独立窗口打开、隐藏地址栏（需 HTTPS）。Service Worker 在 Tauri 壳内不注册；nginx 补 `.webmanifest` MIME + `sw.js` 不缓存

## 修复 · 安卓存图（v0.2.3 · 2026-06-09）

- **修复了 App 无法保存图片**：安卓存图被 Tauri ACL 拦截(`plugin:android-fs|write_file not allowed by ACL`)。`tauri-plugin-android-fs` 的 `default` 权限集为 `all-without-delete`,排除了 `write`/`remove`,而存图要用 `write_file` 与 `remove_file`(失败回滚)。`capabilities/android.json` 补 `allow-write-file` + `allow-remove-file`

---

## 数据规模

- 代码：约 50 个源文件 / 约 4700 行 TS+TSX
- 测试：**260 个测试** · 35 个 test file · 全绿
- 构建：gzip **~163KB** JS · ~7.8KB CSS
- 无 CDN 依赖
- TypeScript strict 0 error · ESLint 0 error

---

## 暂未实现（设计文档覆盖但延后）

- ADIF 导入（需本地 IndexedDB 业务 schema）
- 多 FMO 同时连接（primary + secondary）
- APRS 历史 > 20 持久化
- HUD 强度 Slider
- `--hud-scanline-opacity` 扫描线视觉
- Messages 分页（当前只拉第一页）
- SpeakingBar 历史 UI（store 有数据，未暴露）
