# FmoDeck

业余无线电 FMO 平台的日志与控制台 · 战术 HUD 主题 · [FmoLogs](https://github.com/dingle1122/FmoLogs) 的二次开发版本

仓库地址：<https://github.com/wh0am1i/FmoDeck>

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
- **排行榜 / 老朋友**：基于已有日志聚合
- **消息**：收件箱 + 撰写 + 回复 + 一键全部已读 + 推送到达即时刷新
- **控制**：一键普通/待机模式 + 重启 APRS 服务
- **APRS Passcode**：按呼号派生登录密码（标准 APRS-IS 算法）
- **SpeakingBar**：实时显示讲话者，与对方通联统计；只通联过一次的呼号
  高亮"新朋友"徽章
- **中继切换**：一键 prev/next、列表选择
- **双语**：简体中文 / English（右上角切换）
- **HUD 视觉**：霓虹辉光强度、扫描线不透明度可调

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

## 部署（Docker · HTTP）

> **为什么只有 HTTP？**  FMO 设备只开 `ws://`，没有 TLS 证书。如果前端
> 走 HTTPS，浏览器的"混合内容"策略会把所有 `ws://` 连接拦截，页面就无法
> 与设备通信。因此当前唯一可行的部署是 HTTP —— 代价是地址栏会显示
> "Not secure"，且桌面通知 / PWA 安装等依赖 secure context 的 API 用不了。

### 目录与容器

仓库根目录已备好：

- `Dockerfile` —— 多阶段构建（Node 构建 → nginx:alpine 托管）
- `docker-compose.yml` —— 一键启动容器
- `docker/nginx.conf.template` —— 容器内 nginx 配置，已含 SPA fallback
  + gzip + 静态资源长缓存

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

| 参数 | 默认 | 说明 |
|---|---|---|
| `BASE_PATH` | `/` | 子路径部署时改成 `/fmodeck/` |
| `LISTEN_PORT` | `80` | 容器内 nginx 监听端口 |
| `NODE_VERSION` | `20` | 构建阶段的 Node 版本 |
| `NGINX_VERSION` | `1.27` | 运行阶段的 nginx 版本 |

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
  - '8080:80'   # 原来是 '127.0.0.1:8080:80'
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
