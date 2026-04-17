# FmoDeck Phase 2b · I/O 层（IndexedDB + sql.js + WebSocket） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 Phase 2a 之外带 I/O 副作用的 `lib/*` 模块 —— IndexedDB 抽象、sql.js 本地 wasm 加载、QSO SQL 查询（含新功能 `getCallsignStats`）、FmoApiClient（带 `reqId` 或串行队列回退 + 指数退避重连）、MessageService。所有模块仍保持**框架无关**（无 React 引用），Phase 3 会在此基础上写 Zustand store。

**Architecture:** 按"副作用就近封装"原则，每个模块只暴露纯 Promise API。IndexedDB 用 fake-indexeddb 单测；sql.js 查询用内存数据库单测；WebSocket 用 mock 单测 + 一次性实机冒烟。

**Tech Stack:** TypeScript 5.7+ strict · sql.js 1.13（本地 wasm 打包，不走 CDN）· nanoid（reqId 生成，~130 bytes）· fake-indexeddb 6（测试替身）· Vitest 3

**关键前置决定（已与用户确认）：**

- fmo.local 匿名可连，本地网络测试
- sql.js wasm **本地打包**（安全 + 离线可用，bundle +~1.2MB 可接受）
- IndexedDB schema **兼容 FmoLogs**（`logs_from_{callsign}` per-store + `dedupKey`）

**FmoLogs 参考文件：**

- IndexedDB schema：`/Users/wh0am1i/FmoLogs/src/services/db.js` L287–428（LOGS*DB_NAME=`FmoLogsData`, per-callsign stores, dedupKey=`${utcDate}*${toCallsign}`, 索引 timestamp/toCallsign/toGrid/relayName/utcDate）
- sql.js loader：L1–14
- WebSocket：`messageService.js`, `fmoApi.js`

---

## 文件结构（Phase 2b 结束时应有的新增文件）

```
/Users/wh0am1i/FmoDeck/
├── src/
│   └── lib/
│       ├── storage/
│       │   ├── indexeddb.ts             新建 · IndexedDB 抽象（Promise 化）
│       │   └── indexeddb.test.ts        新建 · fake-indexeddb 单测
│       ├── db/
│       │   ├── sql-loader.ts            新建 · sql.js wasm 本地加载
│       │   ├── sql-loader.test.ts       新建 · 冒烟测试
│       │   ├── qso-queries.ts           新建 · QSO 查询（含 getCallsignStats）
│       │   ├── qso-queries.test.ts      新建
│       │   └── fixtures.ts              新建 · 测试用 QSO 样本生成器
│       ├── fmo-api/
│       │   ├── client.ts                新建 · FmoApiClient（reqId/串行队列 + 重连）
│       │   ├── client.test.ts           新建 · mock WebSocket
│       │   └── reqid-probe.ts           新建 · 实机探测工具
│       └── message-service/
│           ├── client.ts                新建 · MessageService（薄包装）
│           └── client.test.ts           新建
└── scripts/
    └── probe-reqid.mjs                  新建 · Node CLI 实机探测 fmo.local
```

**文件职责边界：**

- `lib/storage/` — 通用 IndexedDB Promise 包装，不含业务
- `lib/db/` — sql.js 加载 + QSO 业务查询
- `lib/fmo-api/` — WebSocket 协议客户端（对应 FmoLogs `fmoApi.js`）
- `lib/message-service/` — 消息领域 API（对应 FmoLogs `messageService.js`）

---

## 前置准备

- [ ] **在 Phase 2a 分支基础上创建 Phase 2b 分支**

```bash
cd /Users/wh0am1i/FmoDeck
git checkout -b phase-2b-io-layer
```

---

## Task 1: 实机探测 fmo.local 的 `reqId` 支持

**Files:**

- Create: `scripts/probe-reqid.mjs`

> 这是 Phase 2b **最重要的前置验证** —— 决定后续 `FmoApiClient` 走"并发 reqId 路由"还是"串行队列回退"。**其他任务可以在探测完成前先做**（IndexedDB、sql.js），但 Task 5（FmoApiClient）依赖本任务结果。

- [ ] **Step 1: 写探测脚本 `scripts/probe-reqid.mjs`**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/scripts
```

写入：

```js
// Node 22+ 内建 WebSocket，直接用
// 探测：发两个带不同 reqId 的并发请求，看服务器是否回传 reqId。

const HOST = process.argv[2] ?? 'ws://fmo.local/ws'
const TIMEOUT_MS = 5000

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function probeWithReqId() {
  return new Promise((resolve) => {
    const ws = new WebSocket(HOST)
    const reqId = genId()
    const result = { supports: false, echoed: null, error: null }
    const timer = setTimeout(() => {
      ws.close()
      resolve(result)
    }, TIMEOUT_MS)

    ws.onopen = () => {
      const req = { type: 'station', subType: 'getCurrent', reqId }
      console.log('→', JSON.stringify(req))
      ws.send(JSON.stringify(req))
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        console.log('←', JSON.stringify(msg))
        if (msg.reqId === reqId) result.supports = true
        result.echoed = msg.reqId ?? null
        clearTimeout(timer)
        ws.close()
        resolve(result)
      } catch (e) {
        result.error = String(e)
      }
    }

    ws.onerror = (e) => {
      result.error = e.message ?? 'WebSocket error'
      clearTimeout(timer)
      resolve(result)
    }
  })
}

const result = await probeWithReqId()
console.log('\n=== Probe Result ===')
console.log(JSON.stringify(result, null, 2))
console.log(result.supports ? '✅ 服务端支持 reqId 回传' : '❌ 不支持 reqId，需走串行队列回退')
process.exit(result.supports ? 0 : 1)
```

- [ ] **Step 2: 跑探测**

```bash
node /Users/wh0am1i/FmoDeck/scripts/probe-reqid.mjs
```

**期望输出**之一：

- **支持**：stdout 显示 `msg.reqId === ourReqId`，退出码 0
- **不支持**：服务器响应没有 `reqId` 字段，退出码 1

- [ ] **Step 3: 记录结果到计划文档末尾**

在本文件底部追加一节 `## 附录：Task 1 实机探测结果`，记录：

- 日期
- fmo.local 版本（若可得）
- reqId 支持状态
- 后续 Task 5 采用的路线（reqId 或串行队列）

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-reqid.mjs docs/superpowers/plans/2026-04-17-phase-2b-io-layer.md
git commit -m "chore(probe): 添加 reqId 实机探测脚本并记录探测结果"
```

---

## Task 2: IndexedDB Promise 抽象（`lib/storage/indexeddb.ts`）

**Files:**

- Modify: `package.json`（+ fake-indexeddb）
- Create: `src/lib/storage/indexeddb.ts`
- Create: `src/lib/storage/indexeddb.test.ts`

> 目标：提供最小集 Promise API（`openDatabase`、`put`、`get`、`getAll`、`getAllByIndex`、`deleteItem`、`deleteDatabase`），对应 FmoLogs db.js 散落的原生 IndexedDB 调用。
>
> 不封装业务 schema —— 业务 schema（per-callsign store、meta store）由上层 `lib/db/qso-queries.ts` 和后续 stores 持有。

- [ ] **Step 1: 安装测试替身**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm add -D fake-indexeddb
```

- [ ] **Step 2: 写失败测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/storage
```

写入 `src/lib/storage/indexeddb.test.ts`：

```ts
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  deleteDatabase,
  deleteItem,
  getAll,
  getAllByIndex,
  getItem,
  openDatabase,
  putItem
} from './indexeddb'

const DB = 'test_db_phase2b'
const STORE = 'items'

afterEach(async () => {
  await deleteDatabase(DB)
})

async function openFixture(): Promise<IDBDatabase> {
  return openDatabase(DB, 1, (db) => {
    if (!db.objectStoreNames.contains(STORE)) {
      const s = db.createObjectStore(STORE, { keyPath: 'id' })
      s.createIndex('by_tag', 'tag', { unique: false })
    }
  })
}

describe('openDatabase', () => {
  it('首次打开时触发升级回调', async () => {
    const db = await openFixture()
    expect(db.objectStoreNames.contains(STORE)).toBe(true)
    db.close()
  })

  it('重复打开不触发升级', async () => {
    let upgrades = 0
    await openDatabase(DB, 1, () => upgrades++)
    await openDatabase(DB, 1, () => upgrades++)
    expect(upgrades).toBe(1)
  })
})

describe('putItem / getItem / getAll', () => {
  it('存取单条记录', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x', value: 1 })
    expect(await getItem(db, STORE, 'a')).toEqual({ id: 'a', tag: 'x', value: 1 })
    db.close()
  })

  it('getItem 找不到时返回 undefined', async () => {
    const db = await openFixture()
    expect(await getItem(db, STORE, 'missing')).toBeUndefined()
    db.close()
  })

  it('getAll 返回全部记录', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await putItem(db, STORE, { id: 'b', tag: 'y' })
    const all = await getAll<{ id: string; tag: string }>(db, STORE)
    expect(all).toHaveLength(2)
    expect(all.map((r) => r.id).sort()).toEqual(['a', 'b'])
    db.close()
  })
})

describe('getAllByIndex', () => {
  it('按索引筛选', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await putItem(db, STORE, { id: 'b', tag: 'y' })
    await putItem(db, STORE, { id: 'c', tag: 'x' })
    const xs = await getAllByIndex(db, STORE, 'by_tag', 'x')
    expect(xs).toHaveLength(2)
    db.close()
  })
})

describe('deleteItem', () => {
  it('删除后读取返回 undefined', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    await deleteItem(db, STORE, 'a')
    expect(await getItem(db, STORE, 'a')).toBeUndefined()
    db.close()
  })
})

describe('deleteDatabase', () => {
  it('删除后下次打开触发升级', async () => {
    const db = await openFixture()
    await putItem(db, STORE, { id: 'a', tag: 'x' })
    db.close()
    await deleteDatabase(DB)

    let upgraded = false
    const db2 = await openDatabase(DB, 1, () => {
      upgraded = true
    })
    expect(upgraded).toBe(true)
    db2.close()
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

```bash
pnpm test src/lib/storage/indexeddb.test.ts
```

- [ ] **Step 4: 实现 `src/lib/storage/indexeddb.ts`**

```ts
/**
 * IndexedDB 的最小 Promise 包装。
 *
 * 只封装机械的 callback → Promise 转换，不引入业务 schema。
 * 业务 schema（store 名、索引、keyPath）由上层代码持有并通过 `upgrade` 回调声明。
 */

type UpgradeFn = (db: IDBDatabase, oldVersion: number, newVersion: number) => void

function asPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function openDatabase(
  name: string,
  version: number,
  upgrade: UpgradeFn
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (event) => {
      upgrade(req.result, event.oldVersion, event.newVersion ?? version)
    }
  })
}

export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
    req.onblocked = () => reject(new Error(`Delete of ${name} blocked`))
  })
}

export async function putItem<T>(
  db: IDBDatabase,
  store: string,
  value: T,
  key?: IDBValidKey
): Promise<void> {
  const tx = db.transaction(store, 'readwrite')
  const req =
    key === undefined ? tx.objectStore(store).put(value) : tx.objectStore(store).put(value, key)
  await asPromise(req)
}

export async function getItem<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey
): Promise<T | undefined> {
  const tx = db.transaction(store, 'readonly')
  const result = (await asPromise(tx.objectStore(store).get(key))) as T | undefined
  return result
}

export async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  const tx = db.transaction(store, 'readonly')
  return (await asPromise(tx.objectStore(store).getAll())) as T[]
}

export async function getAllByIndex<T>(
  db: IDBDatabase,
  store: string,
  indexName: string,
  key: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const tx = db.transaction(store, 'readonly')
  const idx = tx.objectStore(store).index(indexName)
  return (await asPromise(idx.getAll(key))) as T[]
}

export async function deleteItem(db: IDBDatabase, store: string, key: IDBValidKey): Promise<void> {
  const tx = db.transaction(store, 'readwrite')
  await asPromise(tx.objectStore(store).delete(key))
}
```

- [ ] **Step 5: 跑测试确认通过**

```bash
pnpm test src/lib/storage/indexeddb.test.ts
```

期望：8 个测试通过。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/storage/
git commit -m "feat(storage): 添加 IndexedDB Promise 包装（openDatabase/put/get/getAll/index）"
```

---

## Task 3: sql.js 本地 wasm 加载（`lib/db/sql-loader.ts`）

**Files:**

- Modify: `package.json`（+ sql.js + @types/sql.js）
- Create: `src/lib/db/sql-loader.ts`
- Create: `src/lib/db/sql-loader.test.ts`

> 与 FmoLogs 最大差异：**wasm 本地打包**（Vite `?url` 静态资产导入），不走 CDN。
>
> 为了让 Vitest 能跑，测试里需要 mock `?url` 导入，或者直接跳过加载、假设 wasm 已就位 —— 我们用**后者 + Vite alias**：测试环境 `import.meta.env.MODE === 'test'` 时使用 `locateFile: () => ''`（Node 走文件系统路径直接读 node_modules/sql.js）。

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm add sql.js@^1.13
pnpm add -D @types/sql.js
```

- [ ] **Step 2: 写失败测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/db
```

写入 `src/lib/db/sql-loader.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { loadSql } from './sql-loader'

describe('loadSql · 冒烟', () => {
  it('返回 SqlJs.Database 可用实例', async () => {
    const SQL = await loadSql()
    const db = new SQL.Database()
    db.run('CREATE TABLE t (id INTEGER, name TEXT);')
    db.run('INSERT INTO t VALUES (1, "ba0ax");')
    const rows = db.exec('SELECT * FROM t;')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.values).toEqual([[1, 'ba0ax']])
    db.close()
  }, 15000)

  it('多次调用复用同一 SqlJsStatic 实例', async () => {
    const a = await loadSql()
    const b = await loadSql()
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 3: 实现 `src/lib/db/sql-loader.ts`**

```ts
import initSqlJs, { type SqlJsStatic } from 'sql.js'

let cached: Promise<SqlJsStatic> | null = null

/**
 * 加载 sql.js wasm。
 *
 * - 浏览器（Vite 打包）：通过 `?url` 静态资产导入本地 wasm 文件，不走 CDN
 * - Node（Vitest）：让 sql.js 走默认文件系统路径（node_modules/sql.js/dist/sql-wasm.wasm）
 */
export function loadSql(): Promise<SqlJsStatic> {
  if (cached) return cached

  cached = (async () => {
    // 仅在浏览器构建时引入本地 wasm URL
    // Vite 会把 sql-wasm.wasm 复制到 dist 并返回 hash 化的 URL
    if (typeof window !== 'undefined') {
      const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url')).default
      return initSqlJs({ locateFile: () => wasmUrl })
    }
    // Node 环境：直接用 sql.js 的默认 locateFile（node_modules 路径）
    return initSqlJs()
  })()

  return cached
}
```

- [ ] **Step 4: 让 vite-plugin-checker 忽略 `?url` 导入**

`import 'sql.js/dist/sql-wasm.wasm?url'` 在 TS 里是未知模块。声明一个全局模块：

追加到 `src/vite-env.d.ts`：

```ts
/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const src: string
  export default src
}
```

- [ ] **Step 5: 跑测试**

```bash
pnpm test src/lib/db/sql-loader.test.ts
```

期望：2 个测试通过。**首次运行**可能需要 5–15 秒加载 wasm。

- [ ] **Step 6: 手动验证浏览器构建不走 CDN**

```bash
pnpm build
grep -r "cdn\." dist/ 2>/dev/null || echo "✅ dist/ 不含 CDN 引用"
ls -lh dist/assets/*.wasm 2>/dev/null
```

期望：`dist/assets/` 里有 `sql-wasm-*.wasm` 文件（~1.2MB）且 `dist/` 不含任何 `cdn.` 字样。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/db/sql-loader.ts src/lib/db/sql-loader.test.ts src/vite-env.d.ts
git commit -m "feat(db): 添加 sql.js 本地 wasm 加载器（不走 CDN）"
```

---

## Task 4: QSO SQL 查询（`lib/db/qso-queries.ts`）含 `getCallsignStats`

**Files:**

- Create: `src/lib/db/fixtures.ts`
- Create: `src/lib/db/qso-queries.ts`
- Create: `src/lib/db/qso-queries.test.ts`

> Schema 对齐 FmoLogs SQLite schema（db.js L1213）：
>
> ```sql
> CREATE TABLE qso_logs (
>   logId INTEGER PRIMARY KEY,
>   timestamp INTEGER, freqHz INTEGER, fromCallsign TEXT,
>   fromGrid TEXT, toCallsign TEXT, toGrid TEXT,
>   toComment TEXT, mode TEXT, relayName TEXT, relayAdmin TEXT
> )
> ```
>
> 设计文档 §4.3 / §2.2 指定新功能：`getCallsignStats({ fromCallsign, toCallsign })` 返回 `{ count, firstTime, lastTime }` —— SpeakingBar 用它展示"此人与我通联了多少次/首次/最近一次"。
>
> 本 Task 先实现 **最小闭环**：
>
> - `insertRecords(db, records)`
> - `queryByFromCallsign(db, fromCallsign, { limit, offset })`
> - `getCallsignStats(db, { fromCallsign, toCallsign })`
>
> 其余分页/过滤/删除等 API 等 Phase 4b 用时再按需加。

- [ ] **Step 1: fixtures 样本**

写入 `src/lib/db/fixtures.ts`：

```ts
import type { QsoRecord } from '@/types/qso'

export function makeQso(overrides: Partial<QsoRecord> = {}): QsoRecord {
  return {
    timestamp: 1776038400000, // 2026-04-11 00:00:00Z
    freqHz: 144640000,
    fromCallsign: 'BA0AX',
    fromGrid: 'OM89',
    toCallsign: 'BY4SDL',
    toGrid: 'OM89',
    toComment: '',
    mode: 'FM',
    relayName: 'TestRelay',
    relayAdmin: 'BY0ADM',
    ...overrides
  }
}
```

- [ ] **Step 2: 写失败测试**

写入 `src/lib/db/qso-queries.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { loadSql } from './sql-loader'
import { makeQso } from './fixtures'
import { createSchema, getCallsignStats, insertRecords, queryByFromCallsign } from './qso-queries'
import type { Database } from 'sql.js'

let db: Database

beforeEach(async () => {
  const SQL = await loadSql()
  db = new SQL.Database()
  createSchema(db)
})

describe('createSchema', () => {
  it('建立 qso_logs 表 + 索引', () => {
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    expect(tables[0]?.values.flat()).toContain('qso_logs')
  })
})

describe('insertRecords + queryByFromCallsign', () => {
  it('插入后能按 fromCallsign 查询', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY1ABC', timestamp: 2000 }),
      makeQso({ fromCallsign: 'BY1XYZ', toCallsign: 'BA0AX', timestamp: 3000 })
    ])
    const rows = queryByFromCallsign(db, 'BA0AX', {})
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.toCallsign).sort()).toEqual(['BY1ABC', 'BY4SDL'])
  })

  it('按时间倒序返回', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', timestamp: 3000 }),
      makeQso({ fromCallsign: 'BA0AX', timestamp: 2000 })
    ])
    const rows = queryByFromCallsign(db, 'BA0AX', {})
    expect(rows.map((r) => r.timestamp)).toEqual([3000, 2000, 1000])
  })

  it('支持 limit 和 offset', () => {
    insertRecords(
      db,
      Array.from({ length: 10 }, (_, i) => makeQso({ fromCallsign: 'BA0AX', timestamp: i * 1000 }))
    )
    const page1 = queryByFromCallsign(db, 'BA0AX', { limit: 3, offset: 0 })
    const page2 = queryByFromCallsign(db, 'BA0AX', { limit: 3, offset: 3 })
    expect(page1).toHaveLength(3)
    expect(page2).toHaveLength(3)
    expect(page1[0]?.timestamp).toBe(9000)
    expect(page2[0]?.timestamp).toBe(6000)
  })

  it('中文 toComment 字段正确保存', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', toComment: '你好世界 🚀' })
    ])
    const [row] = queryByFromCallsign(db, 'BA0AX', {})
    expect(row?.toComment).toBe('你好世界 🚀')
  })
})

describe('getCallsignStats（SpeakingBar 用）', () => {
  it('返回 {count, firstTime, lastTime}', () => {
    insertRecords(db, [
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 1000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 2000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY4SDL', timestamp: 3000 }),
      makeQso({ fromCallsign: 'BA0AX', toCallsign: 'BY1ABC', timestamp: 4000 })
    ])
    const stats = getCallsignStats(db, { fromCallsign: 'BA0AX', toCallsign: 'BY4SDL' })
    expect(stats).toEqual({ count: 3, firstTime: 1000, lastTime: 3000 })
  })

  it('无记录返回 count=0 + 时间为 null', () => {
    const stats = getCallsignStats(db, { fromCallsign: 'BA0AX', toCallsign: 'NOBODY' })
    expect(stats).toEqual({ count: 0, firstTime: null, lastTime: null })
  })
})
```

- [ ] **Step 3: 实现 `src/lib/db/qso-queries.ts`**

```ts
import type { Database } from 'sql.js'
import type { CallsignStats, QsoRecord } from '@/types/qso'

const QSO_COLS = [
  'timestamp',
  'freqHz',
  'fromCallsign',
  'fromGrid',
  'toCallsign',
  'toGrid',
  'toComment',
  'mode',
  'relayName',
  'relayAdmin'
] as const

/** 建表 + 索引。对应 FmoLogs db.js L1213 schema。 */
export function createSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS qso_logs (
      logId INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      freqHz INTEGER NOT NULL,
      fromCallsign TEXT NOT NULL,
      fromGrid TEXT,
      toCallsign TEXT,
      toGrid TEXT,
      toComment TEXT,
      mode TEXT,
      relayName TEXT,
      relayAdmin TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_from_ts ON qso_logs (fromCallsign, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_from_to ON qso_logs (fromCallsign, toCallsign);
  `)
}

export function insertRecords(db: Database, records: readonly QsoRecord[]): void {
  if (records.length === 0) return
  const placeholders = QSO_COLS.map(() => '?').join(', ')
  const stmt = db.prepare(`INSERT INTO qso_logs (${QSO_COLS.join(', ')}) VALUES (${placeholders})`)
  try {
    db.run('BEGIN')
    for (const r of records) {
      stmt.run(QSO_COLS.map((c) => r[c]))
    }
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  } finally {
    stmt.free()
  }
}

export interface QueryOptions {
  limit?: number
  offset?: number
}

export function queryByFromCallsign(
  db: Database,
  fromCallsign: string,
  { limit, offset }: QueryOptions
): QsoRecord[] {
  let sql = `SELECT ${QSO_COLS.join(', ')} FROM qso_logs WHERE fromCallsign = ? ORDER BY timestamp DESC`
  const params: (string | number)[] = [fromCallsign]
  if (typeof limit === 'number') {
    sql += ' LIMIT ?'
    params.push(limit)
    if (typeof offset === 'number') {
      sql += ' OFFSET ?'
      params.push(offset)
    }
  }
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    const rows: QsoRecord[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as QsoRecord
      rows.push(row)
    }
    return rows
  } finally {
    stmt.free()
  }
}

export function getCallsignStats(
  db: Database,
  { fromCallsign, toCallsign }: { fromCallsign: string; toCallsign: string }
): CallsignStats {
  const stmt = db.prepare(
    `SELECT COUNT(*) AS count, MIN(timestamp) AS firstTime, MAX(timestamp) AS lastTime
     FROM qso_logs WHERE fromCallsign = ? AND toCallsign = ?`
  )
  try {
    stmt.bind([fromCallsign, toCallsign])
    stmt.step()
    const row = stmt.getAsObject() as {
      count: number
      firstTime: number | null
      lastTime: number | null
    }
    return {
      count: row.count ?? 0,
      firstTime: row.count > 0 ? row.firstTime : null,
      lastTime: row.count > 0 ? row.lastTime : null
    }
  } finally {
    stmt.free()
  }
}
```

- [ ] **Step 4: 跑测试**

```bash
pnpm test src/lib/db/
```

期望：sql-loader 2 个 + qso-queries 8 个 = 10 个通过。

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/
git commit -m "feat(db): 添加 QSO SQL 查询层（含 getCallsignStats for SpeakingBar）"
```

---

## Task 5: FmoApiClient（`lib/fmo-api/client.ts`）

**Files:**

- Modify: `package.json`（+ nanoid）
- Create: `src/lib/fmo-api/client.ts`
- Create: `src/lib/fmo-api/client.test.ts`

> **本 Task 的两种实现路线（由 Task 1 探测结果决定）：**
>
> - **路线 A（reqId 支持）**：请求带 `reqId`（nanoid 生成），用 `Map<reqId, {resolve, reject, timer}>` 路由响应 —— 支持并发请求，无队头阻塞
> - **路线 B（不支持 reqId）**：串行队列，同时只 in-flight 1 个请求，响应按 `type:subType` 匹配 —— 与 FmoLogs 行为一致
>
> **两种路线都包含**：
>
> - 自动重连（指数退避：100ms → 200ms → 400ms → ... cap 30s，max 10 次）
> - 连接状态事件（`open` / `close` / `error` / `message`）
> - 断连时清空 in-flight 请求并拒绝 Promise
>
> 下面的代码以 **路线 A（reqId）** 为模板。若 Task 1 显示不支持，按"实现差异"小节改动。

- [ ] **Step 1: 安装 nanoid**

```bash
pnpm add nanoid
```

- [ ] **Step 2: 写失败测试（mock WebSocket）**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/fmo-api
```

写入 `src/lib/fmo-api/client.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FmoApiClient } from './client'

// 简易 WebSocket mock
class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 0 // CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  open() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  close() {
    this.readyState = 3
    this.onclose?.(new CloseEvent('close'))
  }

  send(data: string) {
    this.sent.push(data)
  }
}

beforeEach(() => {
  MockWebSocket.instances = []
  // @ts-expect-error 覆写全局
  globalThis.WebSocket = MockWebSocket
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FmoApiClient · 连接', () => {
  it('connect() 在 open 事件后 resolve', async () => {
    const client = new FmoApiClient('ws://fmo.local/ws')
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p
    expect(client.isConnected).toBe(true)
  })

  it('disconnect() 关闭 WebSocket', async () => {
    const client = new FmoApiClient('ws://fmo.local/ws')
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p
    client.disconnect()
    expect(client.isConnected).toBe(false)
  })
})

describe('FmoApiClient · 请求（reqId 路线）', () => {
  it('send() 附带 reqId，收到带同 reqId 的响应后 resolve', async () => {
    const client = new FmoApiClient('ws://fmo.local/ws')
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p

    const reqPromise = client.send({ type: 'station', subType: 'getCurrent' })
    const ws = MockWebSocket.instances[0]!
    const sent = JSON.parse(ws.sent[0]!) as { reqId: string }
    expect(sent.reqId).toBeTypeOf('string')

    ws.emit({
      type: 'station',
      subType: 'getCurrent',
      reqId: sent.reqId,
      code: 0,
      data: { uid: 'relay-1' }
    })
    const resp = await reqPromise
    expect(resp).toMatchObject({ code: 0, data: { uid: 'relay-1' } })
  })

  it('并发请求按 reqId 正确路由', async () => {
    const client = new FmoApiClient('ws://fmo.local/ws')
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p

    const p1 = client.send({ type: 'qso', subType: 'getList' })
    const p2 = client.send({ type: 'message', subType: 'getList' })
    const ws = MockWebSocket.instances[0]!
    const sent1 = JSON.parse(ws.sent[0]!) as { reqId: string }
    const sent2 = JSON.parse(ws.sent[1]!) as { reqId: string }

    // 故意乱序回
    ws.emit({ type: 'message', subType: 'getList', reqId: sent2.reqId, code: 0, data: 'm' })
    ws.emit({ type: 'qso', subType: 'getList', reqId: sent1.reqId, code: 0, data: 'q' })

    expect((await p1).data).toBe('q')
    expect((await p2).data).toBe('m')
  })

  it('请求超时拒绝 Promise', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', { requestTimeoutMs: 1000 })
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p

    const req = client.send({ type: 'station', subType: 'getCurrent' })
    vi.advanceTimersByTime(1500)
    await expect(req).rejects.toThrow(/timeout/i)
    vi.useRealTimers()
  })
})

describe('FmoApiClient · 重连', () => {
  it('意外断连后按指数退避重连', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', {
      reconnect: { initialDelayMs: 100, maxDelayMs: 1000, maxAttempts: 3 }
    })
    await (async () => {
      const p = client.connect()
      MockWebSocket.instances[0]!.open()
      await p
    })()
    expect(MockWebSocket.instances).toHaveLength(1)

    MockWebSocket.instances[0]!.close()
    vi.advanceTimersByTime(100)
    expect(MockWebSocket.instances).toHaveLength(2)
    MockWebSocket.instances[1]!.close()
    vi.advanceTimersByTime(200)
    expect(MockWebSocket.instances).toHaveLength(3)
    vi.useRealTimers()
  })

  it('主动 disconnect() 不触发重连', async () => {
    vi.useFakeTimers()
    const client = new FmoApiClient('ws://fmo.local/ws', {
      reconnect: { initialDelayMs: 100, maxDelayMs: 1000, maxAttempts: 5 }
    })
    const p = client.connect()
    MockWebSocket.instances[0]!.open()
    await p
    client.disconnect()
    vi.advanceTimersByTime(5000)
    expect(MockWebSocket.instances).toHaveLength(1)
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3: 实现 `src/lib/fmo-api/client.ts`（路线 A · reqId）**

```ts
import { nanoid } from 'nanoid'
import type { FmoRequest, FmoResponse } from '@/types/fmo-protocol'

export interface ReconnectOptions {
  initialDelayMs: number
  maxDelayMs: number
  maxAttempts: number
}

export interface FmoClientOptions {
  requestTimeoutMs?: number
  reconnect?: ReconnectOptions
}

type PendingRequest = {
  resolve: (value: FmoResponse) => void
  reject: (reason: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

const DEFAULT_RECONNECT: ReconnectOptions = {
  initialDelayMs: 500,
  maxDelayMs: 30_000,
  maxAttempts: 10
}

/**
 * FMO WebSocket 客户端（路线 A：reqId 路由）。
 *
 * 与 FmoLogs 对应：`services/fmoApi.js` + `messageService.js`。
 * 改进：
 * - 并发请求（按 reqId 路由，无队头阻塞）
 * - 指数退避自动重连
 * - 断连时清空 in-flight 请求并拒绝
 */
export class FmoApiClient {
  private ws: WebSocket | null = null
  private readonly pending = new Map<string, PendingRequest>()
  private readonly requestTimeoutMs: number
  private readonly reconnectOpts: ReconnectOptions
  private reconnectAttempts = 0
  private shouldReconnect = false
  private connectPromise: Promise<void> | null = null

  constructor(
    private readonly url: string,
    opts: FmoClientOptions = {}
  ) {
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 10_000
    this.reconnectOpts = opts.reconnect ?? DEFAULT_RECONNECT
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise
    this.shouldReconnect = true
    this.connectPromise = this.doConnect()
    return this.connectPromise
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      ws.onopen = () => {
        this.reconnectAttempts = 0
        resolve()
      }
      ws.onmessage = (ev) => this.handleMessage(ev)
      ws.onclose = () => {
        this.failAllPending(new Error('WebSocket closed'))
        if (this.shouldReconnect) this.scheduleReconnect()
      }
      ws.onerror = () => reject(new Error('WebSocket error'))
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectOpts.maxAttempts) return
    const delay = Math.min(
      this.reconnectOpts.initialDelayMs * 2 ** this.reconnectAttempts,
      this.reconnectOpts.maxDelayMs
    )
    this.reconnectAttempts++
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connectPromise = this.doConnect().catch(() => undefined) as Promise<void>
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    this.failAllPending(new Error('Client disconnected'))
    this.ws?.close()
    this.ws = null
    this.connectPromise = null
  }

  /**
   * 发送请求，等待对应 reqId 的响应。
   */
  send(req: FmoRequest): Promise<FmoResponse> {
    if (!this.isConnected) return Promise.reject(new Error('Not connected'))
    const reqId = nanoid(10)
    const payload: FmoRequest = { ...req, reqId }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId)
        reject(new Error(`Request timeout: ${req.type}/${req.subType}`))
      }, this.requestTimeoutMs)
      this.pending.set(reqId, { resolve, reject, timer })
      this.ws!.send(JSON.stringify(payload))
    })
  }

  private handleMessage(ev: MessageEvent): void {
    let msg: FmoResponse
    try {
      msg = JSON.parse(ev.data as string) as FmoResponse
    } catch {
      return
    }
    const reqId = msg.reqId
    if (reqId && this.pending.has(reqId)) {
      const p = this.pending.get(reqId)!
      this.pending.delete(reqId)
      clearTimeout(p.timer)
      p.resolve(msg)
    } else {
      // 无 reqId 的推送消息 → 后续 Task 6 的 MessageService 订阅
      this.listeners.forEach((cb) => cb(msg))
    }
  }

  private readonly listeners = new Set<(msg: FmoResponse) => void>()

  onPush(listener: (msg: FmoResponse) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private failAllPending(error: Error): void {
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer)
      reject(error)
    }
    this.pending.clear()
  }
}
```

**实现差异（路线 B · 串行队列）：**

- 删除 `pending` Map，改为单个 `currentRequest`
- `send()` 将请求入队，上个请求完成后才发下一个
- `handleMessage` 按 `type:subType:Response` 匹配
- 其他（重连、事件）保持一致

- [ ] **Step 4: 跑测试**

```bash
pnpm test src/lib/fmo-api/client.test.ts
```

期望：7 个测试通过。

- [ ] **Step 5: 实机冒烟（连 fmo.local）**

写一个一次性脚本 `scripts/smoke-fmo-api.mjs`：

```js
// 参考 Task 1 的 probe 脚本，直接调用 FmoApiClient
// 因为这里只是冒烟，可以直接复制粘贴关键请求，不用 TS 构建
```

跑起来能成功发 `{type:'station', subType:'getCurrent'}` 并拿到响应即可。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/fmo-api/
git commit -m "feat(fmo-api): 实现 FmoApiClient（reqId 路由 + 指数退避重连）"
```

---

## Task 6: MessageService（`lib/message-service/client.ts`）

**Files:**

- Create: `src/lib/message-service/client.ts`
- Create: `src/lib/message-service/client.test.ts`

> 这一层**很薄** —— 把 `FmoApiClient.send()` 的泛型响应映射到消息领域的具体 API（`getList`、`getDetail`、`setRead`、`send`、`deleteItem`、`deleteAll`）+ 订阅 push 推送（`summary` / `ack`）。
>
> 因为 `FmoApiClient` 已经做了 reqId 路由 + 超时 + 重连，这里只做**类型窄化**和**事件分发**。

- [ ] **Step 1: 实现 + 测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/message-service
```

写入 `src/lib/message-service/client.ts`：

```ts
import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { MessageSummary, MessageDetail } from '@/types/message'

type Unsub = () => void

export class MessageService {
  constructor(private readonly api: FmoApiClient) {}

  async getList(params: { limit?: number; offset?: number } = {}): Promise<MessageSummary[]> {
    const resp = await this.api.send({ type: 'message', subType: 'getList', data: params })
    if (resp.code !== 0) throw new Error(`getList failed: code=${resp.code}`)
    return (resp.data ?? []) as MessageSummary[]
  }

  async getDetail(messageId: string): Promise<MessageDetail> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'getDetail',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`getDetail failed: code=${resp.code}`)
    const data = resp.data as { message?: MessageDetail } | MessageDetail
    return 'message' in data && data.message ? data.message : (data as MessageDetail)
  }

  async setRead(messageId: string): Promise<void> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'setRead',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`setRead failed: code=${resp.code}`)
  }

  async send(to: string, content: string): Promise<void> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'send',
      data: { to, content }
    })
    if (resp.code !== 0) throw new Error(`send failed: code=${resp.code}`)
  }

  async deleteItem(messageId: string): Promise<void> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'deleteItem',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`deleteItem failed: code=${resp.code}`)
  }

  async deleteAll(): Promise<void> {
    const resp = await this.api.send({ type: 'message', subType: 'deleteAll' })
    if (resp.code !== 0) throw new Error(`deleteAll failed: code=${resp.code}`)
  }

  /** 订阅新消息摘要推送（服务端主动推送 `{type:'message', subType:'summary'}`）。 */
  onSummary(cb: (summary: MessageSummary) => void): Unsub {
    return this.api.onPush((msg) => {
      if (msg.type === 'message' && msg.subType === 'summary') {
        cb(msg.data as MessageSummary)
      }
    })
  }
}
```

- [ ] **Step 2: 写测试**

写入 `src/lib/message-service/client.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'
import { MessageService } from './client'
import type { FmoApiClient } from '@/lib/fmo-api/client'

function mockClient(): FmoApiClient {
  return {
    send: vi.fn(),
    onPush: vi.fn()
  } as unknown as FmoApiClient
}

describe('MessageService', () => {
  it('getList 返回数组', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getListResponse',
      code: 0,
      data: [{ messageId: '1', from: 'BA0AX', timestamp: 1000, isRead: false }]
    })
    const svc = new MessageService(api)
    const list = await svc.getList({ limit: 10 })
    expect(list).toHaveLength(1)
    expect(api.send).toHaveBeenCalledWith({
      type: 'message',
      subType: 'getList',
      data: { limit: 10 }
    })
  })

  it('非 0 code 抛错', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getListResponse',
      code: 1,
      data: null
    })
    const svc = new MessageService(api)
    await expect(svc.getList()).rejects.toThrow(/code=1/)
  })

  it('getDetail 自动解包 data.message', async () => {
    const api = mockClient()
    vi.mocked(api.send).mockResolvedValue({
      type: 'message',
      subType: 'getDetailResponse',
      code: 0,
      data: {
        message: { messageId: 'x', from: 'BA0AX', timestamp: 1, isRead: true, content: '嗨' }
      }
    })
    const svc = new MessageService(api)
    const detail = await svc.getDetail('x')
    expect(detail.content).toBe('嗨')
  })

  it('onSummary 只转发 message/summary 推送', () => {
    let registered: ((msg: unknown) => void) | null = null
    const api = mockClient()
    vi.mocked(api.onPush).mockImplementation((cb) => {
      registered = cb as (msg: unknown) => void
      return () => undefined
    })

    const svc = new MessageService(api)
    const received: unknown[] = []
    svc.onSummary((s) => received.push(s))

    registered!({ type: 'message', subType: 'summary', code: 0, data: { messageId: 'a' } })
    registered!({ type: 'station', subType: 'setCurrent', code: 0, data: {} })
    expect(received).toEqual([{ messageId: 'a' }])
  })
})
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test src/lib/message-service/
```

期望：4 个测试通过。

- [ ] **Step 4: Commit**

```bash
git add src/lib/message-service/
git commit -m "feat(message-service): 添加消息领域 API 包装（含 onSummary 推送订阅）"
```

---

## Task 7: 端到端验证 + 实机冒烟 + 文档

**Files:**

- Create: `scripts/smoke-live.mjs`（实机脚本，不 commit 凭证）
- Modify: `README.md`

- [ ] **Step 1: 跑全量 CI**

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

期望：全部通过。测试总数 80（Phase 2a）+ 8（indexeddb）+ 2（sql-loader）+ 8（qso-queries）+ 7（fmo-api）+ 4（message-service） ≈ **109 个测试全绿**。

- [ ] **Step 2: 实机端到端烟雾**

写 `scripts/smoke-live.mjs`（**不 commit 凭证**，如果有）：

```js
// 用编译后的 dist 跑不方便；改为用 tsx/vitest 临时 eval。
// 最简：开 dev server，手动打开浏览器 console 测：
//   import('/src/lib/fmo-api/client.ts').then(...)
```

手动测试脚本：

1. `pnpm dev` 启动
2. 浏览器开 http://localhost:5173/ → Console
3. 跑：
   ```js
   const { FmoApiClient } = await import('/src/lib/fmo-api/client.ts')
   const c = new FmoApiClient('ws://fmo.local/ws')
   await c.connect()
   console.log(await c.send({ type: 'station', subType: 'getCurrent' }))
   ```
4. 期望：收到 `{code: 0, data: {...}}` 响应
5. 手动断网 5 秒再恢复，验证自动重连

- [ ] **Step 3: 更新 README**

把"实施计划"小节改为：

```markdown
## 实施计划

- [Phase 1 · 地基](docs/superpowers/plans/2026-04-16-phase-1-foundation.md) ✅
- [Phase 2a · 纯逻辑层](docs/superpowers/plans/2026-04-17-phase-2a-pure-logic.md) ✅
- [Phase 2b · I/O 层](docs/superpowers/plans/2026-04-17-phase-2b-io-layer.md) ✅
- Phase 3（状态层 + hooks）— 待规划
```

- [ ] **Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: 标记 Phase 2b 完成"
```

---

## Phase 2b 完成验收

- ✅ IndexedDB 抽象可独立 `import`，fake-indexeddb 单测全绿
- ✅ sql.js wasm **本地打包**（`dist/assets/*.wasm` 存在，`dist/` 不含 CDN 引用）
- ✅ `getCallsignStats` 查询正确（为 Phase 4c SpeakingBar 准备）
- ✅ `FmoApiClient` 通过 mock WebSocket 单测 + 实机连 fmo.local 冒烟通过
- ✅ 指数退避重连行为符合预期（断连 → 自动恢复）
- ✅ `MessageService` 在 `FmoApiClient` 之上提供类型窄化 API
- ✅ `pnpm test` 全绿（新增 ~29 个测试）
- ✅ `pnpm build` 产物大小可接受（+sql.js wasm 约 +1.2MB 到 dist）

Phase 2b 结束后即可进入 Phase 3（状态层 + React hooks）的 brainstorm。

---

## 附录：Task 1 实机探测结果

**日期**：2026-04-17
**服务器**：`ws://fmo.local/ws`（Node 24.14.1 内建 WebSocket 客户端）

**请求发出**：

```json
{ "type": "station", "subType": "getCurrent", "reqId": "zpqnitu7" }
```

**服务器响应**：

```json
{
  "type": "station",
  "subType": "getCurrentResponse",
  "data": { "uid": 3867322085, "name": "如意甘肃" },
  "code": 0
}
```

**结论**：

- ❌ 服务端**不回传 reqId**
- ✅ 连接和请求本身工作正常，`type:subType:Response` 匹配（`getCurrent` → `getCurrentResponse`）
- 决策：**Task 5 FmoApiClient 走路线 B（串行队列）**，与 FmoLogs `messageService.js` / `fmoApi.js` 行为一致

**串行队列要点**：

- 同时只 in-flight 1 个请求
- 响应按 `${subType}Response === ${requestSubType}Response` 或预定义映射匹配
- 后续请求排队等待，`processQueue()` 按序触发
- 超时/断连时当前 in-flight 被拒绝，队列清空
