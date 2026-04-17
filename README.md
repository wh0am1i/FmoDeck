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

## 许可证

同原 FmoLogs，待补。
