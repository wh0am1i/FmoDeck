# FmoDeck

业余无线电 FMO 平台的日志与控制台 · 战术 HUD 主题 · [FmoLogs](https://github.com/dingle1122/FmoLogs) 的二次开发版本

仓库地址：<https://github.com/wh0am1i/FmoDeck>

> 本项目由 AI 辅助编码完成（Claude Code），大部分实现、重构与样式是 AI 生成的，人类做架构决策 / 需求拍板 / 审阅。

## 更新记录

### v0.1.9 (2026-05-03)

**新增**

- **SSTV 新模式**:Scottie S1(VIS 0x3C)+ Scottie S2(VIS 0x38),sync 在中段
  的 Convention B 实现,decoder 加 `preludeMs` 字段处理 VIS 后的 9ms starting sync
- **超时残图保留**:之前帧未解完直接丢弃,现在保留已解出的部分行 + 右上角
  挂"未完整 N/M"徽章。下次 VIS 命中或离开页面才清空
- **手动模式选择**:VIS 漏掉时的救场入口 —— waiting 区可折叠"手动解码"面板,
  选 mode + 秒数(0..3s,受 tap 缓冲限制)→ 跳过 VIS 强制按指定模式从 N 秒前开始解码
- **信号指示器**:等待期 SpectrumWaveform 下方多三色能量条 —— 1900 LEAD /
  1200 SYNC / 1700 IMG,Goertzel 100ms 轮询,直观判断"是不是 SSTV 信号要来了"
- **PNG 元数据**:导出图片写入 SSTVMode / SSTVDisplay / Software 三个 tEXt
  chunk(零依赖手写 CRC32),离线辨识来源
- **消息方向**:连接后自动拉本机呼号(`user/getInfo` 优先,fallback `qso` 取 from),
  消息列表 / 详情按 from/to 区分进出方向,不再混淆收发
- **顶部模式列表**改成 chip 风格,每个 mode 一个独立小标签

**改进**

- **Hampel filter** 替换所有 mode 的 5-行固定中位数:孤立异常仍被压住,真实 slant
  缓变直接通过(消除"5-行台阶"现象)。MIN_THRESHOLD=1.5ms 兜底 MAD=0 退化情况
- **静音超时改时间阈值**(5s,所有 mode 统一)。原来按行数 5 行,PD120 单行 508ms
  只要 2.5s 网络抖动就误判;改后长行 mode 不再被波动打断
- **FM 解调瞬态丢弃**:行起始 5ms warmup 前缀经 LPF 后丢弃,sync 检测窗口不再
  被 biquad 启动瞬态污染。新增 `dsp.fmDemod()` 一站式助手,5 个 mode 全部切换
- **VIS 检测放宽**:仅需 ≥1 段 leader 通过(原本两段都要),弱信号 / QSB 下不再
  漏识别。break + start + 8 bits + parity + stop 五道结构校验保留误识别保护
- **YCbCr 色彩空间统一**:抽公共 `lib/sstv/colorspace.ts`,统一注释为 BT.601
  full-range / JPEG。新增 12 个色彩 roundtrip 测试覆盖纯色饱和度
- **历史筛选**改成动态从 `modeRegistry` 生成,后续加 mode 自动出现,不再硬编码
- **SSTV 全文案 i18n**:view / canvas / history / item / signal / received toast
  全覆盖中英双语,`relativeTime` 接受 `t` 参数走 i18n
- **消息已读状态保留**:`load`/`refresh` 合并新数据时按 messageId 单向保留客户端
  已设置的 `to` 和 `isRead`,跨 nav 切换不再丢失;effect deps 去掉 `list` 改用
  store subscribe,避免 in-flight worker 被自己的写入打断
- **网格坐标跳转**改为自家项目 `https://maidenmap.wh0am1i.com/`(原 OpenStreetMap)
- **Update / SSTV view ESLint 清理**:多余 type assertion + 未转义引号

**修复**

- Scottie S1 错位 + 大斜率根因:之前误用 Convention A(sync 在行首),实际协议 sync
  在行中段(G/B 之后、R 之前)。重写 row 结构 + 新增 `detectMidSyncOffset` ±20ms
  滑窗精确定位 sync,slant 跟踪不受影响
- PD120 Lanczos 实验:理论上能保留更锐峰值,但 FM 解调输出带噪、Lanczos sinc
  旁瓣放大噪声反而劣化。已撤回 PD120 默认 box,选项保留待后续找到对噪声更温和的
  滤波器再启用

**调试工具**(仅 dev 构建,prod 构建完全剥离)

- SSTV waiting 区可"录下一帧"按钮,WAV 16-bit Int16 单声道,带 2s pre-buffer
  保留 VIS 前导,onDone / onTimeout 自动 finalize 出可下载链接
- Vite `import.meta.env.DEV` 双层守卫(call site 三元 + UI lazy import + zustand
  `/* @__PURE__ */`),prod build grep 8 个关键字 + 字符串全部 0 残留

**工程**

- 测试:从 v0.1.8 时的 ~280 涨到 **465 个**(新增 8 hampel + 12 colorspace + 4
  Lanczos + 4 png-metadata + 8 Scottie roundtrip + 数十个其他模块覆盖)
- `tsc --noEmit` / ESLint / 全测试三栏全绿
- prod build 651 KB 主 chunk(gzip 205 KB),与 v0.1.8 持平

### v0.1.8 (2026-04-22)

**新增**

- **SSTV 接收**:新 `/sstv` tab,自动识别并解码 Robot 36 / Robot 72 / Martin M1 /
  Martin M2 / PD 120 五种模式,渐进式绘图,最近 5 帧滚动缩略,完整历史存 IndexedDB
- **今日已联 ⭐** 标:Top20 / 老朋友 / 日志表的呼号右侧显示今日是否联过
- **Header 版本号**动态从 `APP_VERSION` 读,不再硬编码

**改进**

- 解码对 Opus 压缩的鲁棒性提升(Robot 72 对角剪切、Martin M2 长图后半段偏移等典型问题修复)

### v0.1.7 (2026-04-19)

**新增**

- **Android release 签名**:APK 改走正式 release keystore(原 debug 随机 key),
  后续版本可以覆盖升级保留本地数据(IndexedDB 日志 / FMO 地址 / HUD 设置等)。
  签名指纹固定 = 所有后续版本通行证
- **应用内升级**(仅 Android):启动自动检查 + Settings `[ 更新 ]` 手动触发 +
  HUD 风 Dialog(发现新版 → 下载进度 → sha256 校验 → 调起系统包安装器);
  24h 去重、`cache: no-store` 防 WebView 缓存、`@Keep` 防 R8 strip
- **自建升级服务器契约**:纯静态 nginx,manifest 走 `<host>/fmodeck/android/latest.json`,
  不依赖 GitHub API(国内可达性友好);通过 `VITE_UPDATE_BASE_URL` 构建时注入
- **Android 原生**:`REQUEST_INSTALL_PACKAGES` 权限 + `FileProvider` + Kotlin
  `installApk` companion + Rust `install_apk` JNI 命令

**改进**

- **Passcode 计算器**从 Settings 再挪回 APRS 菜单(v0.1.5 反向挪回来,按功能归属)
- **WebView 远程调试**:release APK 也强制 `setWebContentsDebuggingEnabled(true)`,
  可通过 `chrome://inspect` 看 Console
- **cleartext 配置**:Tauri 2.10+ 默认 `usesCleartextTraffic="false"`,改为无条件覆盖
  为 `true`,保证 FMO `ws://` 明文连接在 release 构建下不被拦
- **Vite 环境变量注入**:CI 新增 `VITE_UPDATE_BASE_URL` Secret

**升级说明 · 从 v0.1.5 Android 版升级时必读**

- 本版本起 APK 签名从 debug 切到 release,**签名指纹不同** → 直接覆盖安装会被
  Android 系统拒绝(`INSTALL_FAILED_UPDATE_INCOMPATIBLE`)
- **老用户必须先卸载 v0.1.5**,再全新安装 v0.1.7(本地 QSO 日志请先导出 ADIF 备份)
- v0.1.7 之后的所有升级可以正常覆盖,不再需要卸载
- 首次点应用内"立即安装"会弹"允许此应用安装未知应用"系统设置页,授权后回到应用
  再点一次即可走到系统包安装器

**工程**

- 跳过 v0.1.6 版本号(升级链路端到端调试用的过渡版本)
- updater feature 346 个单测全绿:version-compare / manifest / download-sha256 / 状态机
- prettier 统一 format,ESLint warnings 清零

### v0.1.5 (2026-04-19)

**新增**

- **频谱页面**（`/spectrum`）：五面板组合 —— 柱状频谱、示波器、瀑布图、
  实时遥测（RMS / 峰值频率 / 峰值强度）、讲话名册（滚动时粘顶）
- **SpeakingBar 迷你频谱**：收听开启时实时显示
- **日志页「历史」切换**：融合进日期过滤组，点击原地把下方表格切换为
  讲话历史，再点任一日期切回日志
- **Android 打包**：新增 GitHub Actions workflow，支持 aarch64 +
  armv7 双 ABI，debug APK 约 60MB

**改进**

- **地名反查**：主链路换到高德 `regeo`（需 `VITE_AMAP_KEY`），格式
  精简为「市 - 省」；没配 key 时 fallback 到 BigDataCloud
- **SpeakingBar**：呼号和地名字号放大、地名改高亮色，移动端改两行
  结构，HOST / 新朋友徽章不再被长地名挤下一行
- **移动端排版**：日志 / 历史 / 老朋友表格在窄屏把 GRID 内联到呼号
  下；日志头三个操作按钮只留图标；中文地名不再按字符断行
- **APRS passcode 计算器**从 APRS 页挪到 `[ 设置 ]`
- **Android 状态栏**不再遮挡内容（主动消费 systemBars insets）

**部署 / 构建**

- Docker 构建新增 `VITE_AMAP_KEY` 参数；CI workflow 注入 `AMAP_KEY`
  GitHub secret

**其他**

- README 标注项目由 AI 辅助编码；git 提交去掉 `Co-Authored-By` 尾行

### v0.1.4 (2026-04-18)

- **APRS 远程控制按构建目标分流**：桌面版（Tauri）默认关闭并 tree-shake，
  web 版保留；通过 `VITE_ENABLE_APRS` + `.env.tauri` 控制
- **Windows 安装包图标修复**：重新生成 `icon.ico` 为 BMP 格式多尺寸条目
  （16–256px），解决 NSIS 安装器不认 PNG 压缩 ICO 导致的空图标

### v0.1.3 (2026-04-18)

**新增**

- **桌面应用**：基于 Tauri 2 打包为原生 macOS / Windows / Linux 应用，
  用系统 WebView 渲染，产物 ~10 MB；
  `pnpm tauri:dev` / `pnpm tauri:build` 一键出包
- **跨平台 CI**：推 `v*` tag 时自动在 GitHub Actions 上构建 4 个平台
  （macOS arm64 / x86_64、Linux x64、Windows x64），产物自动关联到
  Release 草稿
- 桌面版两个隐形福利：地址栏无 "Not secure" 提示；不受 Chrome
  Private Network Access 限制，`ws://fmo.local` 随便连

**改进**

- 排行榜每行重构为上下两行布局：主行「序号 + 呼号 + 次数」、
  第二行「位置 + 最近日期」，移动端也不再挤爆
- 排行榜「次数」列数字 tabular-nums 右对齐，位数不同也对得上

**其他**

- GitHub Actions 升级到 Node 24 兼容版本（Node 20 即将弃用）
- 外链统一走 `openExternal()` 工具函数，桌面 / 浏览器端都正确跳转

### v0.1.2 (2026-04-18)

- **音频收听**：裸 Web Audio 直连 FMO `/audio`，8kHz PCM + HPF/LPF/EQ/压缩；
  SpeakingBar 右侧开关 + VU + 音量 + 静音；自己讲话时自动过滤回授
- **大字体模式**（仅桌面）、**中继搜索**（StationSwitcher ≥ 6 条时出现）
- **网格 → 地名**：Maidenhead 反查 OSM Nominatim，可点击跳转，结果缓存
- 修若干 bug：网格链接误触父行、消息字段名、呼号/SSID 拆分等

### v0.1.1 (2026-04-17)

- APRS 远程控制（普通 / 待机 / 软重启 + 参数表单 + 20 条历史 + Passcode 计算器）
- 桌面通知、消息回复与批量删除、日期范围筛选、按过滤结果导出 ADIF
- SpeakingBar「✦ 新朋友」徽章、HUD 风删除确认 Dialog
- ADIF 二次导入去重、中继切换竞态修复、全量 i18n

### v0.1.0

首个可用版本 —— 基于 FmoLogs 的 React + TypeScript 完整重写，战术 HUD 主题。

## 致谢

FmoDeck 是基于 [**FmoLogs**](https://github.com/dingle1122/FmoLogs)（作者
[@dingle1122](https://github.com/dingle1122)）的二次开发作品。原项目
完整搭建了与 FMO 设备交互的协议实现、日志同步、APRS 相关能力等核心业务逻辑。
本仓库在其基础上做界面与交互层的重写、增加战术 HUD 主题与若干打磨，
但所有"能用起来"的根基都来自 FmoLogs。特此鸣谢 ✨

## 功能一览

- **日志**：连 FMO 实时拉 QSO，本地过滤（呼号前缀 / 日期范围）+ 分页 +
  按过滤结果导出 ADIF
- **ADIF 导入**：`.adi` 文件解析到本地 IndexedDB；与服务器日志合并展示，
  `(呼号, 时间戳)` 维度自动去重
- **排行榜 / 老朋友**：基于已有日志聚合；行内显示对方网格 + 实际地名
- **消息**：收件箱 + 撰写 + 回复 + 一键全部已读 / 单条 / 全部删除 +
  推送到达即时刷新
- **控制**：一键普通/待机模式 + 重启 APRS 服务
- **APRS 远程控制**：走 APRS-IS 网关跨网络控制设备（普通 / 待机 /
  软重启）+ 20 条历史 + Passcode 计算器
- **音频收听**：直连 FMO `/audio` WebSocket 播放对讲音频；音量可调、
  VU 电平条；自己讲话时自动过滤回授
- **SpeakingBar**：实时显示讲话者 + 位置 + 与对方通联统计；只通联过
  一次的呼号高亮"新朋友"徽章
- **网格 → 地名**：Maidenhead 网格反查 OpenStreetMap，展示实际地名
  可点击跳转地图；结果缓存
- **中继切换**：一键 prev/next、列表选择、模糊搜索
- **双语**：简体中文 / English（右上角切换）
- **HUD 视觉**：霓虹辉光强度、扫描线不透明度可调；桌面端大字体模式

## 技术栈

- **构建**：Vite 7 · TypeScript 5.7+ strict
- **UI**：React 19 · React Router v7 · Tailwind CSS v4 · shadcn/ui · Radix
- **状态**：Zustand 5（含 persist）
- **存储**：IndexedDB（本地 QSO 持久层）· sql.js（ADIF 解析）
- **i18n**：i18next · react-i18next
- **测试**：Vitest 3 · jsdom · @testing-library/react
- **质量**：ESLint 9（flat config）· Prettier 3 · vite-plugin-checker
- **CI**：GitHub Actions（`.github/workflows/ci.yml`）

## 开发

前置：Node ≥ 20.19 · pnpm ≥ 9

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发（http://localhost:5173）
pnpm build        # 生产构建（输出到 dist/）
pnpm preview      # 预览构建产物
pnpm test         # 运行测试
pnpm test:watch   # 监视测试
pnpm typecheck    # 类型检查
pnpm lint         # ESLint 检查
pnpm lint:fix     # ESLint 自动修复
pnpm format       # Prettier 格式化
pnpm format:check # Prettier 检查
```

## HUD 主题

冷蓝 `#00D9FF` 为主调，琥珀 `#FFB000` 为警戒色，品红 `#FF3E5C` 为危险色。
支持 light / dark / system 三档（右上角切换）。装饰强度通过 CSS 变量
`--hud-intensity` 控制（Settings → `[ 界面视觉 ]`）。

## 桌面应用（Tauri · macOS / Windows / Linux）

除了浏览器版，FmoDeck 也可打包为原生桌面应用 —— 用系统 WebView 渲染，
产物 ~10 MB。桌面版有两个额外好处：

- 没有地址栏「Not secure」提示
- 不受 Chrome Private Network Access 限制，`ws://fmo.local` 随便连

### 本地开发

前置：[Rust toolchain](https://www.rust-lang.org/tools/install)（`rustc` ≥ 1.77）+ 平台 WebView 依赖（macOS 自带；Linux 需 `webkit2gtk`）。

```bash
pnpm install
pnpm tauri:dev     # 起 dev 壳 + Vite HMR
pnpm tauri:build   # 打包当前平台产物到 src-tauri/target/release/bundle/
```

### 多平台 CI

`.github/workflows/tauri-release.yml` —— 推 `v*` tag 时自动在 4 个平台
（macOS arm64 / x86_64、Linux x64、Windows x64）构建，产物关联到
GitHub Release 草稿。

### 未签名说明

- **macOS**：CI 做 ad-hoc 本地签名，首次打开右键 → 打开；若报「已损坏」
  跑 `xattr -cr /Applications/FmoDeck.app` 清 quarantine 即可
- **Windows**：SmartScreen 警告点「仍要运行」
- **Linux**：无签名负担

## 部署（Docker · HTTP）

> **为什么只有 HTTP？** FMO 设备只开 `ws://`，没有 TLS 证书。如果前端
> 走 HTTPS，浏览器的"混合内容"策略会把所有 `ws://` 连接拦截，页面就无法
> 与设备通信。因此当前唯一可行的部署是 HTTP —— 代价是地址栏会显示
> "Not secure"，且桌面通知 / PWA 安装等依赖 secure context 的 API 用不了。

仓库根目录已备好 `Dockerfile`（多阶段：Node 构建 → nginx:alpine 托管）+
`docker-compose.yml` + `docker/nginx.conf.template`（SPA fallback + gzip）。

```bash
git clone https://github.com/wh0am1i/FmoDeck.git
cd FmoDeck
docker compose up -d --build
```

默认监听 `127.0.0.1:8080`，走宿主机反代对外。直接暴露公网把
`docker-compose.yml` 的 `ports` 改成 `"8080:80"`。可调参数在 `Dockerfile`
顶部 `ARG`（`BASE_PATH` / `LISTEN_PORT` / `NODE_VERSION` / `NGINX_VERSION`）。

## 许可证

[MIT](LICENSE) —— 与上游 [FmoLogs](https://github.com/dingle1122/FmoLogs)
保持一致。版权声明里同时保留 FmoLogs Contributors 与 FmoDeck Contributors，
以示来源。
