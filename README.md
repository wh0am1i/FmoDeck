# FmoDeck

业余无线电 FMO 平台的日志与控制台 · 战术 HUD 主题 · [FmoLogs](https://github.com/dingle1122/FmoLogs) 的二次开发版本

仓库地址：<https://github.com/wh0am1i/FmoDeck>

## 更新记录

### v0.1.2 (2026-04-18)

**新增**

- **音频收听**：裸 Web Audio 实现直连 FMO 的 `/audio` 端点，8kHz PCM
  下行，配 HPF / LPF / EQ×3 / 动态压缩处理链；SpeakingBar 右侧一键开关
  - Popover 内 VU 电平条 + 音量滑杆 + 静音切换；自动断线重连
- **自语过滤**：配置了「我的呼号」后，自己讲话时自动静音，避免听到
  设备回授的自己声音
- **大字体模式**：Header 主题旁新增 A/A 切换，桌面字号放大到 20px +
  加粗；移动端为避免布局挤爆不启用
- **中继搜索**：StationSwitcher 列表 ≥ 6 条时出现搜索框，按名称或
  UID 模糊匹配；关闭弹窗自动清空
- **网格 → 实际位置**：Maidenhead 网格解析 + OpenStreetMap Nominatim
  反向地理编码，展示为「OM89ij · 北京市, 中国」可点击跳转 OSM；
  localStorage 缓存 + 1 req/s 串行队列，二次访问瞬时命中
- **位置展示覆盖**：日志表格 / 日志详情 / 排行榜 / 老朋友 / SpeakingBar
  当前讲话者
- **APRS 恢复**：远程控制因 gateway 域名白名单问题恢复使用
- **Settings 恢复 [ 身份 ] 段**：用于自语过滤 + SpeakingBar「我自己」
  标签

**修复**

- 点击网格链接时不再误触发父行 `onClick`（日志表格点一下连带弹出
  详情的 bug）
- 消息正文字段名对齐服务端（`content` → `message`，之前渲染为空白）
- 消息撰写时呼号与 SSID 拆成两个输入框（对齐 FmoLogs）

**体验打磨**

- 音频控件两级交互：外置开关一键启/停；Popover 聚焦调节（音量、
  静音、错误提示）
- APRS 参数表单文案全量对齐 FmoLogs 风格：控制呼号 / 目标呼号 /
  APRS 密钥 / 设备密钥；placeholder 更直观
- 所有新增面板全量中英双语 i18n

### v0.1.1 (2026-04-17)

**新增**

- APRS 远程控制恢复（普通 / 待机 / 软重启三按钮 + 参数表单 + 20 条历史）
- 桌面通知：HTTPS 部署下可选开启，新消息 / 新朋友讲话时弹系统通知
- 消息回复、批量「全部已读」、单条与「全部删除」
- 撰写消息改为 呼号 + SSID 两个独立输入框（对齐 FmoLogs）
- 日志筛选支持日期范围（今天 / 近 7 天 / 近 30 天），导出 ADIF 改为导出过滤后的结果
- SpeakingBar 加「✦ 新朋友」徽章（仅通联过 1 次时显示）
- 删除确认弹窗从浏览器原生 `window.confirm` 换成 HUD 风自定义 Dialog
- 所有新增面板全量 i18n（中英文同步）

**修复**

- 二次导入 ADIF 不再重复（ID 改为纯内容派生 + 加载时去重）
- 服务器日志与本地 ADIF 合并时按 (呼号, 时间戳) 去重，避免双份显示
- 中继在设备上被物理按钮切换时，前端每 15s 轮询同步，tab 切回前台即刻补拉
- 发送消息 payload 字段对齐 FMO 服务端（`{callsign, ssid, message}`）
- 消息详情正文字段从 `content` 改为 `message`（之前渲染为空）
- 日期筛选实际生效（LogsTable 补订阅 `dateFilter`）
- 中继切换"点两次才生效"（去掉 RPC 后的 getCurrent 竞态回填）

**体验打磨**

- README 重写为 HTTP 部署专版，补「常见坑」小节
- 移动端 Header / Nav / 日志表头按钮组不再错行
- 导出 ADIF 可按过滤结果导出（不再是全量）
- 内部全量 i18n 覆盖：表头、徽章、toast、aria-label、段标题等
- Footer 加 GitHub 链接 + FmoLogs 二次开发致谢
- MIT License 与上游对齐

### v0.1.0

首个可用版本 —— 基于 FmoLogs 的 React + TypeScript 完整重写，战术 HUD 主题，
覆盖日志 / 排行榜 / 老朋友 / 消息 / 设置等主视图。

## 致谢

FmoDeck 是基于 [**FmoLogs**](https://github.com/dingle1122/FmoLogs)（作者
[@dingle1122](https://github.com/dingle1122)）的二次开发作品。原项目
完整搭建了与 FMO 设备交互的协议实现、日志同步、APRS 相关能力等核心业务逻辑。
本仓库在其基础上做界面与交互层的重写、增加战术 HUD 主题与若干打磨
（见 CHANGELOG），但所有"能用起来"的根基都来自 FmoLogs。
特此鸣谢 ✨

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

### 不签名的代价

- **macOS**：首次打开要「右键 → 打开」绕过 Gatekeeper；想消掉警告需 Apple 开发者账号（$99/年）
- **Windows**：首次运行 SmartScreen 会警告，点「仍要运行」即可；签名证书 $200+/年
- **Linux**：无签名负担，`.deb` / `.AppImage` 双击即用

## 部署（Docker · HTTP）

> **为什么只有 HTTP？** FMO 设备只开 `ws://`，没有 TLS 证书。如果前端
> 走 HTTPS，浏览器的"混合内容"策略会把所有 `ws://` 连接拦截，页面就无法
> 与设备通信。因此当前唯一可行的部署是 HTTP —— 代价是地址栏会显示
> "Not secure"，且桌面通知 / PWA 安装等依赖 secure context 的 API 用不了。

### 目录与容器

仓库根目录已备好：

- `Dockerfile` —— 多阶段构建（Node 构建 → nginx:alpine 托管）
- `docker-compose.yml` —— 一键启动容器
- `docker/nginx.conf.template` —— 容器内 nginx 配置，已含 SPA fallback
  - gzip + 静态资源长缓存

### 一键起容器

```bash
git clone https://github.com/wh0am1i/FmoDeck.git
cd FmoDeck
docker compose up -d --build
```

默认监听在 `127.0.0.1:8080`（只绑本地回环，走宿主机 nginx 反代对外）。
想直接暴露到公网，把 `docker-compose.yml` 里的 `ports` 改成 `"8080:80"`
（去掉 `127.0.0.1:` 前缀）。

停止 / 更新：

```bash
docker compose down
git pull && docker compose up -d --build
```

### 可调参数

全在 `Dockerfile` 顶部 `ARG`：

| 参数            | 默认   | 说明                         |
| --------------- | ------ | ---------------------------- |
| `BASE_PATH`     | `/`    | 子路径部署时改成 `/fmodeck/` |
| `LISTEN_PORT`   | `80`   | 容器内 nginx 监听端口        |
| `NODE_VERSION`  | `20`   | 构建阶段的 Node 版本         |
| `NGINX_VERSION` | `1.27` | 运行阶段的 nginx 版本        |

宿主机映射端口改 `docker-compose.yml` 的 `ports`。

### 宿主机 nginx 反代样例

纯 HTTP（最简单，适合内网 / 自用）：

```nginx
# /etc/nginx/sites-available/fmodeck
server {
    listen       80;
    server_name  fmodeck.example.com;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/fmodeck /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 不用反代直接访问

如果不想装 nginx，改 `docker-compose.yml`：

```yaml
ports:
  - '8080:80' # 原来是 '127.0.0.1:8080:80'
```

然后浏览器直接开 `http://服务器IP:8080/`。

### 常见坑

- **混合内容拦截**：不要在 HTTPS 页面打开 FmoDeck —— `ws://fmo.local`
  会被浏览器直接拒绝。保持 HTTP 即可。
- **SPA 刷新 404**：容器内 nginx 已处理 `try_files ... /index.html`，
  如果你自己改配置别漏。
- **WebSocket 不经反代**：FMO 设备的 `/ws` 和 `/events` 由浏览器直连
  `ws://fmo.local/...`，**不**走你的宿主 nginx，所以不需要配
  `proxy_set_header Upgrade`。

## 许可证

[MIT](LICENSE) —— 与上游 [FmoLogs](https://github.com/dingle1122/FmoLogs)
保持一致。版权声明里同时保留 FmoLogs Contributors 与 FmoDeck Contributors，
以示来源。
