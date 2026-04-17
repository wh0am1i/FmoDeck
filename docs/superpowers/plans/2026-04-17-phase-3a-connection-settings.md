# FmoDeck Phase 3a · 连接 + 设置 state 层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 Phase 3 最小闭环 —— Zustand `settings` store（持久化用户偏好）、`connection` store（持有 FmoApiClient 单例 + 连接状态机）、`useFmoSync` + `useAutoReconnect` 两个 hook —— 为 Phase 4a（Settings + Connection UI）提供 state 基座。

**Architecture:** Zustand v5 + `persist` 中间件（settings 落 localStorage）。connection store 不持久化（瞬态）。hooks 作薄桥接：读 settings 触发 connection 动作，不持有状态。

**Tech Stack:** TypeScript strict · Zustand 5 · Vitest 3 · @testing-library/react（renderHook）

**拆分边界（已与用户确认）：**
- ✅ 本 plan 只做 `connection` + `settings` + hooks 骨架
- ❌ Phase 3b 再做 speaking / logs / top20 / old-friends / messages / station / aprs store
- ❌ **不做 FmoLogs 数据迁移** —— 用户 Phase 4a UI 重新录入

**不在本阶段的事（YAGNI）：**
- WebSocket 多地址自动切换（Phase 3b 或 4a）
- 连接状态 toast 通知（留给 Phase 3b `useToast`）
- FmoLogs localStorage key 读取迁移

---

## 文件结构

```
/Users/wh0am1i/FmoDeck/
└── src/
    ├── stores/                            新建目录
    │   ├── settings.ts                    新建 · 全局设置 store（persist）
    │   ├── settings.test.ts               新建
    │   ├── connection.ts                  新建 · FmoApiClient 单例 + 状态机
    │   └── connection.test.ts             新建
    └── hooks/                             新建目录
        ├── useFmoSync.ts                  新建 · 引导 settings → connection
        ├── useFmoSync.test.ts             新建
        └── useAutoReconnect.ts            新建 · 重连状态桥接（薄）
```

**文件职责边界：**
- `src/stores/*` — Zustand store 定义，不含 React 逻辑
- `src/hooks/*` — React hook 层，消费 store + 触发 lib/ 副作用

---

## 前置准备

- [ ] **创建分支**

```bash
cd /Users/wh0am1i/FmoDeck
git checkout -b phase-3a-connection-settings
```

---

## Task 1: settings store（持久化 localStorage）

**Files:**
- Modify: `package.json`（+ zustand）
- Create: `src/stores/settings.ts`
- Create: `src/stores/settings.test.ts`

> settings 字段（最小集，后续可加）：
> - `fmoAddresses: FmoAddress[]` — 配置过的 FMO 服务器列表
> - `activeAddressId: string | null` — 当前选中哪个
> - `currentCallsign: string` — 登录呼号
> - `protocol: 'ws' | 'wss'`
> - `uiTheme: 'system' | 'light' | 'dark'` — 与 Phase 1 ThemeProvider 最终合一（本阶段先占字段，后续任务迁移）
>
> **持久化 key**：`fmodeck-settings`（与 FmoLogs 的 `fmo_*` key **不冲突**，明确新旧隔离）

- [ ] **Step 1: 安装 zustand**

```bash
pnpm add zustand
```

- [ ] **Step 2: 写失败测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/stores
```

写入 `src/stores/settings.test.ts`：

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { settingsStore, resetSettingsForTest } from './settings'

afterEach(() => {
  resetSettingsForTest()
  localStorage.clear()
})

describe('settings store', () => {
  it('默认值正确', () => {
    const s = settingsStore.getState()
    expect(s.fmoAddresses).toEqual([])
    expect(s.activeAddressId).toBeNull()
    expect(s.currentCallsign).toBe('')
    expect(s.protocol).toBe('ws')
  })

  it('addAddress 追加并可取回', () => {
    settingsStore.getState().addAddress({ id: 'a', host: 'fmo.local' })
    expect(settingsStore.getState().fmoAddresses).toEqual([{ id: 'a', host: 'fmo.local' }])
  })

  it('setActiveAddress 切换激活项', () => {
    const { addAddress, setActiveAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'fmo.local' })
    addAddress({ id: 'b', host: 'other.local' })
    setActiveAddress('b')
    expect(settingsStore.getState().activeAddressId).toBe('b')
  })

  it('removeAddress 删除条目；若激活被删则 activeAddressId 置空', () => {
    const { addAddress, setActiveAddress, removeAddress } = settingsStore.getState()
    addAddress({ id: 'a', host: 'fmo.local' })
    setActiveAddress('a')
    removeAddress('a')
    const s = settingsStore.getState()
    expect(s.fmoAddresses).toEqual([])
    expect(s.activeAddressId).toBeNull()
  })

  it('setCurrentCallsign 强制大写', () => {
    settingsStore.getState().setCurrentCallsign('ba0ax')
    expect(settingsStore.getState().currentCallsign).toBe('BA0AX')
  })

  it('setProtocol 只接受 ws | wss', () => {
    settingsStore.getState().setProtocol('wss')
    expect(settingsStore.getState().protocol).toBe('wss')
  })
})

describe('settings 持久化', () => {
  it('写入后反序列化重建 state', () => {
    settingsStore.getState().addAddress({ id: 'a', host: 'fmo.local' })
    settingsStore.getState().setActiveAddress('a')
    settingsStore.getState().setCurrentCallsign('BA0AX')

    // 模拟"下一次访问"
    const raw = localStorage.getItem('fmodeck-settings')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as { state: { currentCallsign: string; activeAddressId: string } }
    expect(parsed.state.currentCallsign).toBe('BA0AX')
    expect(parsed.state.activeAddressId).toBe('a')
  })
})
```

- [ ] **Step 3: 实现 `src/stores/settings.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FmoAddress {
  id: string
  host: string
  /** 可选 · 显示名 */
  name?: string
}

export interface SettingsState {
  fmoAddresses: FmoAddress[]
  activeAddressId: string | null
  currentCallsign: string
  protocol: 'ws' | 'wss'

  // actions
  addAddress: (addr: FmoAddress) => void
  removeAddress: (id: string) => void
  setActiveAddress: (id: string | null) => void
  setCurrentCallsign: (call: string) => void
  setProtocol: (p: 'ws' | 'wss') => void
}

const INITIAL: Omit<
  SettingsState,
  | 'addAddress'
  | 'removeAddress'
  | 'setActiveAddress'
  | 'setCurrentCallsign'
  | 'setProtocol'
> = {
  fmoAddresses: [],
  activeAddressId: null,
  currentCallsign: '',
  protocol: 'ws'
}

export const settingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...INITIAL,

      addAddress: (addr) =>
        set((s) => ({ fmoAddresses: [...s.fmoAddresses, addr] })),

      removeAddress: (id) =>
        set((s) => ({
          fmoAddresses: s.fmoAddresses.filter((a) => a.id !== id),
          activeAddressId: s.activeAddressId === id ? null : s.activeAddressId
        })),

      setActiveAddress: (id) => set({ activeAddressId: id }),

      setCurrentCallsign: (call) =>
        set({ currentCallsign: call.trim().toUpperCase() }),

      setProtocol: (p) => set({ protocol: p })
    }),
    {
      name: 'fmodeck-settings',
      // 只持久化"用户数据"字段，actions 不持久化
      partialize: (s) => ({
        fmoAddresses: s.fmoAddresses,
        activeAddressId: s.activeAddressId,
        currentCallsign: s.currentCallsign,
        protocol: s.protocol
      })
    }
  )
)

/** 测试用：重置到初始状态（保留 action 引用）。 */
export function resetSettingsForTest(): void {
  settingsStore.setState({ ...INITIAL }, false)
}
```

- [ ] **Step 4: 跑测试**

```bash
pnpm test src/stores/settings.test.ts
```

期望：7 个测试通过。

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/stores/
git commit -m "feat(stores): settings store（Zustand persist · 用户偏好持久化）"
```

---

## Task 2: connection store（FmoApiClient 单例 + 状态机）

**Files:**
- Create: `src/stores/connection.ts`
- Create: `src/stores/connection.test.ts`

> 职责：
> - 持有 **唯一** `FmoApiClient` 实例
> - 暴露连接状态 `'disconnected' | 'connecting' | 'connected' | 'error'`
> - `connect(url)` / `disconnect()` 动作
> - `lastError: Error | null`
>
> **不持有**业务数据（消息、QSO、电台）—— 那些在 Phase 3b 的 feature store 里。
>
> 不持久化（瞬态状态）。

- [ ] **Step 1: 写失败测试（mock FmoApiClient）**

写入 `src/stores/connection.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { connectionStore, resetConnectionForTest } from './connection'

class MockFmoApiClient {
  static instances: MockFmoApiClient[] = []
  url: string
  connectImpl: () => Promise<void> = () => Promise.resolve()
  disconnectImpl: () => void = () => undefined

  constructor(url: string) {
    this.url = url
    MockFmoApiClient.instances.push(this)
  }

  connect(): Promise<void> {
    return this.connectImpl()
  }

  disconnect(): void {
    this.disconnectImpl()
  }
}

beforeEach(() => {
  MockFmoApiClient.instances = []
  vi.doMock('@/lib/fmo-api/client', () => ({ FmoApiClient: MockFmoApiClient }))
})

afterEach(() => {
  resetConnectionForTest()
  vi.doUnmock('@/lib/fmo-api/client')
  vi.resetModules()
})

describe('connection store', () => {
  it('默认状态是 disconnected', () => {
    expect(connectionStore.getState().status).toBe('disconnected')
    expect(connectionStore.getState().client).toBeNull()
  })

  it('connect 成功时状态转为 connected 并创建 client', async () => {
    const { connect } = connectionStore.getState()
    await connect('ws://fmo.local/ws')
    expect(connectionStore.getState().status).toBe('connected')
    expect(connectionStore.getState().client).not.toBeNull()
    expect(connectionStore.getState().currentUrl).toBe('ws://fmo.local/ws')
  })

  it('connect 失败时状态转为 error + lastError', async () => {
    const { connect } = connectionStore.getState()
    MockFmoApiClient.instances = []
    const spy = vi.spyOn(MockFmoApiClient.prototype, 'connect').mockRejectedValueOnce(
      new Error('boom')
    )
    await connect('ws://bad/ws')
    expect(connectionStore.getState().status).toBe('error')
    expect(connectionStore.getState().lastError?.message).toBe('boom')
    spy.mockRestore()
  })

  it('disconnect 清空 client 并转为 disconnected', async () => {
    const { connect, disconnect } = connectionStore.getState()
    await connect('ws://fmo.local/ws')
    disconnect()
    expect(connectionStore.getState().status).toBe('disconnected')
    expect(connectionStore.getState().client).toBeNull()
    expect(connectionStore.getState().currentUrl).toBeNull()
  })

  it('重复 connect 同一 URL 不重建 client', async () => {
    const { connect } = connectionStore.getState()
    await connect('ws://fmo.local/ws')
    const before = connectionStore.getState().client
    await connect('ws://fmo.local/ws')
    expect(connectionStore.getState().client).toBe(before)
  })

  it('connect 到新 URL 时先断开旧的', async () => {
    const { connect } = connectionStore.getState()
    await connect('ws://a.local/ws')
    await connect('ws://b.local/ws')
    expect(connectionStore.getState().currentUrl).toBe('ws://b.local/ws')
    expect(MockFmoApiClient.instances).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 实现 `src/stores/connection.ts`**

```ts
import { create } from 'zustand'
import { FmoApiClient } from '@/lib/fmo-api/client'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
  status: ConnectionStatus
  currentUrl: string | null
  client: FmoApiClient | null
  lastError: Error | null

  connect: (url: string) => Promise<void>
  disconnect: () => void
}

const INITIAL = {
  status: 'disconnected' as ConnectionStatus,
  currentUrl: null as string | null,
  client: null as FmoApiClient | null,
  lastError: null as Error | null
}

export const connectionStore = create<ConnectionState>()((set, get) => ({
  ...INITIAL,

  connect: async (url: string) => {
    const state = get()
    if (state.currentUrl === url && state.status === 'connected') return

    // 切换 URL 前先断开
    if (state.client) {
      state.client.disconnect()
    }

    const client = new FmoApiClient(url)
    set({ status: 'connecting', currentUrl: url, client, lastError: null })

    try {
      await client.connect()
      set({ status: 'connected', lastError: null })
    } catch (err) {
      set({
        status: 'error',
        lastError: err instanceof Error ? err : new Error(String(err))
      })
    }
  },

  disconnect: () => {
    get().client?.disconnect()
    set({ ...INITIAL })
  }
}))

/** 测试用：重置。 */
export function resetConnectionForTest(): void {
  connectionStore.getState().client?.disconnect()
  connectionStore.setState({ ...INITIAL }, false)
}
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test src/stores/connection.test.ts
```

期望：6 个测试通过。

- [ ] **Step 4: Commit**

```bash
git add src/stores/connection.ts src/stores/connection.test.ts
git commit -m "feat(stores): connection store（FmoApiClient 单例 + 状态机）"
```

---

## Task 3: `useFmoSync` + `useAutoReconnect` hooks

**Files:**
- Create: `src/hooks/useFmoSync.ts`
- Create: `src/hooks/useFmoSync.test.ts`
- Create: `src/hooks/useAutoReconnect.ts`

> - `useFmoSync()` —— 挂载到 `App` 根部：
>   - 从 settings 读 `activeAddressId` + `protocol` 算出 URL
>   - 调 `connection.connect(url)`；settings 变化时自动重连
>   - 组件卸载时 `disconnect()`
>
> - `useAutoReconnect()` —— 薄封装：
>   - 暴露 `connection.status` 给 UI 显示重连指示
>   - FmoApiClient 本身已经有指数退避重连（Phase 2b Task 5），所以 hook 主要**只读状态**，不再实现重试逻辑
>   - 如果将来需要"手动重连"按钮，这里加一个 `retry()` 方法再说

- [ ] **Step 1: 写 useFmoSync**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/hooks
```

写入 `src/hooks/useFmoSync.ts`：

```ts
import { useEffect } from 'react'
import { connectionStore } from '@/stores/connection'
import { settingsStore, type FmoAddress } from '@/stores/settings'
import { normalizeHost } from '@/lib/utils/url'

function buildUrl(protocol: 'ws' | 'wss', addr: FmoAddress): string {
  return `${protocol}://${normalizeHost(addr.host)}/ws`
}

/**
 * 引导连接：
 * - 读 settings 的 activeAddressId + protocol 算出 ws URL
 * - 调 connection.connect(url)
 * - settings 变化时自动重连
 * - 组件卸载时断开
 *
 * 挂在 App 根部，全局只应调用一次。
 */
export function useFmoSync(): void {
  useEffect(() => {
    const computeAndConnect = () => {
      const { fmoAddresses, activeAddressId, protocol } = settingsStore.getState()
      const addr = fmoAddresses.find((a) => a.id === activeAddressId)
      if (!addr) {
        connectionStore.getState().disconnect()
        return
      }
      const url = buildUrl(protocol, addr)
      void connectionStore.getState().connect(url)
    }

    // 首次调度
    computeAndConnect()

    // 订阅 settings 变化
    const unsub = settingsStore.subscribe((s, prev) => {
      if (
        s.activeAddressId !== prev.activeAddressId ||
        s.protocol !== prev.protocol ||
        s.fmoAddresses !== prev.fmoAddresses
      ) {
        computeAndConnect()
      }
    })

    return () => {
      unsub()
      connectionStore.getState().disconnect()
    }
  }, [])
}
```

- [ ] **Step 2: 写 useAutoReconnect**

```ts
// src/hooks/useAutoReconnect.ts
import { useSyncExternalStore } from 'react'
import { connectionStore, type ConnectionStatus } from '@/stores/connection'

interface AutoReconnectSnapshot {
  status: ConnectionStatus
  lastError: Error | null
}

/**
 * 薄 hook · 暴露连接状态给 UI 做重连指示。
 *
 * 真正的重连由 FmoApiClient（Phase 2b）内部的指数退避实现。
 * 本 hook 仅订阅状态快照。
 */
export function useAutoReconnect(): AutoReconnectSnapshot {
  return useSyncExternalStore(
    (cb) => connectionStore.subscribe(cb),
    () => {
      const s = connectionStore.getState()
      return { status: s.status, lastError: s.lastError }
    }
  )
}
```

- [ ] **Step 3: 写 useFmoSync 测试**

写入 `src/hooks/useFmoSync.test.ts`：

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFmoSync } from './useFmoSync'
import { settingsStore, resetSettingsForTest } from '@/stores/settings'
import { connectionStore, resetConnectionForTest } from '@/stores/connection'

// 追踪 connect/disconnect 调用
const connectMock = vi.fn<(url: string) => Promise<void>>()
const disconnectMock = vi.fn<() => void>()

beforeEach(() => {
  connectMock.mockReset().mockResolvedValue()
  disconnectMock.mockReset()
  connectionStore.setState({
    connect: connectMock,
    disconnect: disconnectMock
  } as Partial<ReturnType<typeof connectionStore.getState>> as never)
})

afterEach(() => {
  resetSettingsForTest()
  resetConnectionForTest()
  localStorage.clear()
})

describe('useFmoSync', () => {
  it('无激活地址时调用 disconnect', () => {
    renderHook(() => useFmoSync())
    expect(connectMock).not.toHaveBeenCalled()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('有激活地址时按 protocol+host 拼出 ws URL 并 connect', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('ws://fmo.local/ws')
  })

  it('protocol=wss 时拼出 wss URL', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a',
      protocol: 'wss'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('wss://fmo.local/ws')
  })

  it('normalizeHost 自动去协议前缀和尾斜杠', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'https://fmo.local/' }],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenCalledWith('ws://fmo.local/ws')
  })

  it('切换 activeAddressId 后自动重连新地址', () => {
    settingsStore.setState({
      fmoAddresses: [
        { id: 'a', host: 'a.local' },
        { id: 'b', host: 'b.local' }
      ],
      activeAddressId: 'a',
      protocol: 'ws'
    })
    renderHook(() => useFmoSync())
    expect(connectMock).toHaveBeenLastCalledWith('ws://a.local/ws')

    settingsStore.setState({ activeAddressId: 'b' })
    expect(connectMock).toHaveBeenLastCalledWith('ws://b.local/ws')
  })

  it('组件卸载时断开连接', () => {
    settingsStore.setState({
      fmoAddresses: [{ id: 'a', host: 'fmo.local' }],
      activeAddressId: 'a'
    })
    const { unmount } = renderHook(() => useFmoSync())
    disconnectMock.mockClear()
    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: 跑测试**

```bash
pnpm test src/hooks/
```

期望：6 个测试通过。

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat(hooks): useFmoSync 引导 settings→connection + useAutoReconnect 状态订阅"
```

---

## Task 4: 在 App 根部挂 useFmoSync + 端到端

**Files:**
- Modify: `src/App.tsx`
- Modify: `README.md`

> 在 App 里挂 `useFmoSync()`，这样一旦 settings 有 activeAddress，就自动尝试连接。
>
> 现在没 UI 让用户加地址（Phase 4a 才做），所以默认情况 activeAddressId=null，connection 保持 disconnected。但可以通过浏览器 console 手动测：
>
> ```js
> const { settingsStore } = await import('/src/stores/settings.ts')
> settingsStore.getState().addAddress({ id: '1', host: 'fmo.local' })
> settingsStore.getState().setActiveAddress('1')
> // 应该看到 network 里 wss/ws 请求成功
> ```

- [ ] **Step 1: 修改 App.tsx**

读 `src/App.tsx` 当前内容，然后在根组件调用 `useFmoSync()`。

```tsx
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@/app/providers/theme-provider'
import { AppRoutes } from '@/app/routes'
import { AppShell } from '@/components/layout/app-shell'
import { useFmoSync } from '@/hooks/useFmoSync'

export function App() {
  useFmoSync()

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

- [ ] **Step 2: 跑 Phase 1 烟雾测试确认没炸**

```bash
pnpm test tests/app.test.tsx
```

期望：5 个烟雾测试仍然通过。

- [ ] **Step 3: 全量 CI**

```bash
pnpm format && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

期望：全绿。测试总数 110（Phase 2b）+ 7（settings）+ 6（connection）+ 6（useFmoSync）= **129 个测试**。

- [ ] **Step 4: 浏览器实机验证**

```bash
pnpm dev
```

打开 http://localhost:5173/，Console 粘：

```js
const { settingsStore } = await import('/src/stores/settings.ts')
settingsStore.getState().addAddress({ id: '1', host: 'fmo.local' })
settingsStore.getState().setActiveAddress('1')
const { connectionStore } = await import('/src/stores/connection.ts')
setTimeout(() => console.log('status:', connectionStore.getState().status), 500)
```

期望：打印 `status: connected`，Network 里看到 `ws://fmo.local/ws` 握手成功。

- [ ] **Step 5: 更新 README**

把"实施计划"小节改为：

```markdown
## 实施计划

- [Phase 1 · 地基](docs/superpowers/plans/2026-04-16-phase-1-foundation.md) ✅
- [Phase 2a · 纯逻辑层](docs/superpowers/plans/2026-04-17-phase-2a-pure-logic.md) ✅
- [Phase 2b · I/O 层](docs/superpowers/plans/2026-04-17-phase-2b-io-layer.md) ✅
- [Phase 3a · 连接+设置 state 层](docs/superpowers/plans/2026-04-17-phase-3a-connection-settings.md) ✅
- Phase 3b（其余 feature stores + 推送 hooks）— 待规划
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: Phase 3a 完成 —— useFmoSync 挂到 App 根部，state 层就绪"
```

---

## Phase 3a 完成验收

- ✅ settings store 持久化到 `localStorage['fmodeck-settings']`
- ✅ connection store 持有唯一 FmoApiClient 实例，状态机 `disconnected | connecting | connected | error`
- ✅ `useFmoSync` 读 settings 驱动 connection，settings 变化时自动重连
- ✅ 浏览器实机：Console 加地址后自动连 fmo.local，`status === 'connected'`
- ✅ `pnpm test` 全绿（新增 ~19 个测试）
- ✅ `pnpm build` 产物不变（Zustand +3KB）

Phase 3a 结束后可以：
- **优先**：进入 Phase 4a（Settings + Connection UI）—— 因为 state 基座就绪
- **或者**：继续 Phase 3b（剩余 6 个 feature store）再统一上 UI
