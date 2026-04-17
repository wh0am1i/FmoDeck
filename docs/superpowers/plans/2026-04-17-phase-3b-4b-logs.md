# FmoDeck Phase 3b-logs + 4b · Logs 视图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 落地 Logs 视图 —— 从 fmo.local 拉 QSO 日志（`qso/getList`）、展示、搜索过滤、分页、点行看详情（`qso/getDetail`）。同步交付 `features/logs/store.ts`（Phase 3b 子集）。

**Scope 限定（已确认）：**
- ✅ 本阶段：logs store + QsoService + Logs UI（表格 + 过滤 + 分页 + 详情）
- ❌ 不做：ADIF 导入导出（Phase 4h）· 本地 IndexedDB 持久化（Phase 4h）· 其他 feature store

**服务器协议探测结果：**

| 请求                                    | 响应 `data` 形状                                                           |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `{type:'qso', subType:'getList'}`       | `{list: [{logId, timestamp(秒), toCallsign, grid}, ...]}`（limit 被忽略）  |
| `{type:'qso', subType:'getDetail', data:{logId}}` | `{log: {logId, timestamp(秒), freqHz, fromCallsign, fromGrid, toCallsign, toGrid, toComment, mode, relayName, relayAdmin}}` |

**关键差异**：
- 摘要只有 4 字段（grid 而非 toGrid）
- timestamp 是 **Unix 秒**，不是毫秒
- 服务器不支持服务端分页 → 客户端分页

**Tech Stack:** React · Zustand · shadcn Dialog · sonner（已装 · toast 用）· 现有 FmoApiClient

---

## 文件结构

```
/Users/wh0am1i/FmoDeck/
└── src/
    ├── types/
    │   └── qso.ts                         修改 · 加 QsoSummary 类型
    ├── lib/
    │   └── qso-service/
    │       ├── client.ts                  新建 · QsoService（类似 MessageService）
    │       └── client.test.ts             新建
    └── features/
        └── logs/
            ├── logs-view.tsx              改写
            ├── store.ts                   新建
            ├── store.test.ts              新建
            ├── components/
            │   ├── logs-filter.tsx        新建
            │   ├── logs-table.tsx         新建
            │   ├── logs-pagination.tsx    新建
            │   └── log-detail-dialog.tsx  新建
            └── __tests__/
                └── logs-view.test.tsx     新建
```

---

## Task 1: QsoSummary 类型 + QsoService 包装

**Files:**
- Modify: `src/types/qso.ts`
- Create: `src/lib/qso-service/client.ts`
- Create: `src/lib/qso-service/client.test.ts`

- [ ] **Step 1: 加 QsoSummary 类型**

在 `src/types/qso.ts` 追加：

```ts
/** 服务器 qso/getList 返回的摘要项（字段精简）。timestamp 是 Unix 秒。 */
export interface QsoSummary {
  logId: number
  timestamp: number
  toCallsign: string
  grid: string
}
```

- [ ] **Step 2: QsoService 实现**

写入 `src/lib/qso-service/client.ts`：

```ts
import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { QsoRecord, QsoSummary } from '@/types/qso'

export class QsoService {
  constructor(private readonly api: FmoApiClient) {}

  async getList(): Promise<QsoSummary[]> {
    const resp = await this.api.send({ type: 'qso', subType: 'getList' })
    if (resp.code !== 0) throw new Error(`qso/getList failed: code=${resp.code}`)
    const data = resp.data as { list?: QsoSummary[] }
    return data.list ?? []
  }

  async getDetail(logId: number): Promise<QsoRecord & { logId: number }> {
    const resp = await this.api.send({
      type: 'qso',
      subType: 'getDetail',
      data: { logId }
    })
    if (resp.code !== 0) throw new Error(`qso/getDetail failed: code=${resp.code}`)
    const data = resp.data as { log: QsoRecord & { logId: number } }
    return data.log
  }
}
```

- [ ] **Step 3: 测试**

写入 `src/lib/qso-service/client.test.ts`（类似 MessageService 测试结构，mock FmoApiClient）。

- [ ] **Step 4: Commit**

---

## Task 2: features/logs/store.ts

**Files:**
- Create: `src/features/logs/store.ts`
- Create: `src/features/logs/store.test.ts`

**Store 形状：**
```ts
{
  all: QsoSummary[]        // 从服务器拉来的全量摘要
  filter: string           // 搜索文本（呼号前缀）
  page: number             // 当前页（0-indexed）
  pageSize: number         // 默认 20
  status: 'idle' | 'loading' | 'error'
  error: Error | null

  // derived (computed from selectors)
  // filtered: QsoSummary[]
  // pageSlice: QsoSummary[]
  // totalPages: number

  load: (svc: QsoService) => Promise<void>
  setFilter: (s: string) => void
  setPage: (n: number) => void
}
```

- filter 按 `toCallsign` 大小写无关前缀匹配
- 翻页时不重新拉取（纯客户端）
- filter 变化时自动 setPage(0)

- [ ] Write tests + implementation + commit

---

## Task 3: LogsFilter + LogsTable + LogsPagination 组件

**LogsFilter**：Input + Clear 按钮

**LogsTable**：
- 列：Time / To Callsign / Grid / （空操作列）
- 点击 row → 触发 onRowClick(logId)
- 响应式：超窄屏幕隐藏 Grid

**LogsPagination**：Prev / 1-2-3-... / Next

- [ ] Write components + commit

---

## Task 4: LogDetailDialog

按 logId 懒加载详情，展示所有字段。

```
[ LOG DETAIL #173 ]
Time: 2026-04-11 12:35:02
Freq: 1.457500 MHz (FMO)
From: BH6SCA (OM40vp)
To:   BI2RCY (PN11rr)  
Comment: ID:BI2RCY
Relay: 如意甘肃 / BG9JYT
```

loading 时显示骨架；error 时 toast + 关闭。

- [ ] Write component + commit

---

## Task 5: LogsView 集成

- 挂载时：若已连接则自动 load；否则显示 `[ OFFLINE · 请先在 Settings 配置地址 ]`
- "Refresh" 按钮：手动重新拉
- 集成 Filter + Table + Pagination + Detail dialog
- 成功加载后 toast 提示条目数

- [ ] Write view + commit

---

## Task 6: Toaster 挂到 App 根 + 样式微调

- Phase 1 装的 `sonner.tsx` 已就绪，把 `<Toaster />` 加到 App.tsx

- [ ] Update App.tsx + commit

---

## Task 7: 端到端 + README

- 全量 CI 通过
- 实机：`pnpm dev` → 浏览器登录 fmo.local → 点 Logs tab 看到真实日志列表，点行弹详情
- 更新 README

---

## 验收清单

- ✅ LogsView 加载 fmo.local 的 QSO 列表
- ✅ 搜索过滤按呼号前缀生效
- ✅ 分页正确（默认 20/页）
- ✅ 点行弹详情 Dialog（显示全部 10 字段）
- ✅ 断连时 UI 给出清晰提示（不白屏）
- ✅ 刷新按钮工作
- ✅ `pnpm test` 全绿
- ✅ `pnpm build` 可用
