# FmoDeck

业余无线电 FMO 平台的下一代日志与控制台 · 战术 HUD 主题 · React + TypeScript 重写版

前身是 [FmoLogs](../FmoLogs)（Vue 3）。本仓库承载完整重写，分阶段推进。

## 设计文档

- [迁移总设计](docs/superpowers/specs/2026-04-16-fmodeck-migration-design.md)

## 实施计划

- [Phase 1 · 地基](docs/superpowers/plans/2026-04-16-phase-1-foundation.md) ✅
- [Phase 2a · 纯逻辑层](docs/superpowers/plans/2026-04-17-phase-2a-pure-logic.md) ✅
- [Phase 2b · I/O 层](docs/superpowers/plans/2026-04-17-phase-2b-io-layer.md) ✅
- [Phase 3a · 连接+设置 state 层](docs/superpowers/plans/2026-04-17-phase-3a-connection-settings.md) ✅
- [Phase 4a · Settings + Connection UI](docs/superpowers/plans/2026-04-17-phase-4a-settings-ui.md) ✅
- [Phase 3b-logs + 4b · Logs 视图](docs/superpowers/plans/2026-04-17-phase-3b-4b-logs.md) ✅
- Phase 4f · Messages 视图（含 messages store）✅
- Phase 4g · APRS 远控（含 aprs store + gateway client）✅
- Phase 4c · SpeakingBar 实时讲话增强（含 speaking store + FmoEventsClient）✅
- Phase 4d · Top20 排行榜 ✅
- Phase 4e · Old Friends 视图（聚合 + 搜索 + 分页）✅
- Phase 4h · ADIF 导出（导入留给下一轮）✅
- Phase 3b 其余（station store · 按需再做）— 迁移基本完成

## 技术栈

- **构建**：Vite 7 · TypeScript 5.7+ strict
- **UI**：React 19 · React Router v7 · Tailwind CSS v4 · shadcn/ui · Radix
- **测试**：Vitest 3 · jsdom · @testing-library/react
- **质量**：ESLint 9（flat config）· Prettier 3 · vite-plugin-checker
- **CI**：GitHub Actions

未来阶段将引入：Zustand（状态）· sql.js + IndexedDB（存储）· crypto-js（APRS 签名）。

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

## 路由

- `/logs` — QSO 日志（默认）
- `/top20` — 排行榜
- `/old-friends` — 老朋友
- `/messages` — 消息中心
- `/settings` — 设置

所有视图当前为占位，业务实装在 Phase 4 的子阶段逐步落地。

## HUD 主题

冷蓝 `#00D9FF` 为主调，琥珀 `#FFB000` 为警戒色，品红 `#FF3E5C` 为危险色。支持 light / dark / system 三档（右上角切换）。装饰强度通过 CSS 变量 `--hud-intensity` 控制。

## 部署（Docker + 宿主机 nginx 反代）

纯前端 SPA，产物为静态目录。推荐 Docker 构建 + 宿主 nginx 反代。

```bash
docker compose up -d --build   # 构建并启动（默认绑 127.0.0.1:8080）
docker compose down            # 停止
```

**可调参数**均集中在 `Dockerfile` 顶部 `ARG`：

- `BASE_PATH`（默认 `/`）—— 子路径部署时改成 `/fmodeck/`
- `LISTEN_PORT`（默认 `80`）—— 容器内 nginx 监听端口

宿主机端口改 `docker-compose.yml` 的 `ports` 映射。

**宿主 nginx 反代样例**（`/etc/nginx/sites-available/fmodeck`）：

```nginx
server {
    listen       443 ssl http2;
    server_name  fmodeck.example.com;

    ssl_certificate     /etc/letsencrypt/live/fmodeck.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fmodeck.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

> FMO 设备 WebSocket 由浏览器直连（非经宿主反代），故反代层无需额外 `Upgrade` 头。

## 许可证

同原 FmoLogs，待补。
