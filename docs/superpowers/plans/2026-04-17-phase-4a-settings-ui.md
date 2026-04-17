# FmoDeck Phase 4a · Settings + Connection UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 Phase 3a 的 `settings` + `connection` state 层配 UI —— Settings 视图支持 CRUD FMO 地址、录入呼号、切换协议；Header 展示连接状态指示；Nav 若未连接给出提示。用户能全 UI 完成"首次配置 → 连上 fmo.local"的闭环。

**Architecture:** 纯 React + shadcn/ui 视图层，消费 Phase 3a 的两个 store。无新 state 逻辑；无 lib 改动。

**Tech Stack:** React 19 · Zustand（已装）· shadcn Dialog/Input/Select/Button · lucide-react 图标 · nanoid（已装，生成 address id）

**用户场景（首次配置闭环）：**

1. 打开应用 → Header 显示 "UNCONFIGURED"
2. 点 Settings tab → 看到空列表 + "Add address" 按钮
3. 填 host（如 `fmo.local`）+ name，点确定
4. 选择新增地址为 active
5. Header 转为 "CONNECTING..." → "ONLINE"，显示协议和地址
6. 回主视图，所有数据层就绪

---

## 文件结构

```
/Users/wh0am1i/FmoDeck/
└── src/
    ├── components/
    │   └── layout/
    │       └── connection-indicator.tsx          新建 · Header 用的状态指示
    └── features/
        └── settings/
            ├── settings-view.tsx                 改写（Phase 1 占位 → 真实）
            ├── components/                       新建子目录
            │   ├── fmo-address-list.tsx          新建 · 地址列表
            │   ├── fmo-address-dialog.tsx        新建 · 新增/编辑模态
            │   └── callsign-field.tsx            新建 · 呼号输入（含校验）
            └── __tests__/                        新建
                └── settings-view.test.tsx
```

**文件职责边界：**

- `components/layout/connection-indicator.tsx` — 纯展示组件，从 `useAutoReconnect` 读状态
- `features/settings/*` — Settings 功能垂直切片
- `settings-view.tsx` — 页面主组件，组合子组件
- `fmo-address-list.tsx` — 展示 + 选中 + 删除，无 Dialog 逻辑
- `fmo-address-dialog.tsx` — 新增模态，封装表单状态

---

## Task 1: Header 连接状态指示

**Files:**

- Create: `src/components/layout/connection-indicator.tsx`
- Modify: `src/components/layout/header.tsx`（在 ThemeButton 左边插入指示器）

> 4 种状态 UI：
>
> - `disconnected` · 灰色圆点 · "UNCONFIGURED"（无激活地址）或 "OFFLINE"
> - `connecting` · 琥珀色脉冲 · "CONNECTING..."
> - `connected` · 绿色实心 · `ONLINE · fmo.local`（显示当前 host）
> - `error` · 品红 · `ERROR · {message 首句}`
>
> 区分 `disconnected` 的两种原因：
>
> - `activeAddressId === null` → "UNCONFIGURED"
> - 其他 → "OFFLINE"（进入过 connected 后断开）

- [ ] **Step 1: 创建 connection-indicator**

```tsx
import { useAutoReconnect } from '@/hooks/useAutoReconnect'
import { connectionStore } from '@/stores/connection'
import { settingsStore } from '@/stores/settings'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

function useCurrentUrl(): string | null {
  return useSyncExternalStore(
    (cb) => connectionStore.subscribe(cb),
    () => connectionStore.getState().currentUrl
  )
}

function useActiveAddressId(): string | null {
  return useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.getState().activeAddressId
  )
}

export function ConnectionIndicator() {
  const { status, lastError } = useAutoReconnect()
  const url = useCurrentUrl()
  const activeId = useActiveAddressId()

  let dotClass = 'bg-muted-foreground'
  let label = ''

  if (status === 'connected') {
    dotClass = 'bg-green-500'
    label = `ONLINE · ${new URL(url ?? 'ws://unknown').host}`
  } else if (status === 'connecting') {
    dotClass = 'bg-accent animate-pulse'
    label = 'CONNECTING...'
  } else if (status === 'error') {
    dotClass = 'bg-destructive'
    const msg = lastError?.message.split(':')[0] ?? 'UNKNOWN'
    label = `ERROR · ${msg}`
  } else {
    // disconnected
    label = activeId ? 'OFFLINE' : 'UNCONFIGURED'
  }

  return (
    <div
      className="hud-mono flex items-center gap-2 text-xs text-muted-foreground"
      aria-label="连接状态"
    >
      <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: 在 Header 里插入指示器**

读 `src/components/layout/header.tsx`，在主题切换按钮**左侧**加 `<ConnectionIndicator />`：

```tsx
// 大约长这样
<div className="flex items-center gap-4">
  <ConnectionIndicator />
  <Button ...>{主题按钮}</Button>
</div>
```

- [ ] **Step 3: 烟雾测试 App 仍正常**

```bash
pnpm test tests/app.test.tsx
```

期望：Phase 1 的 5 个烟雾测试继续通过（Header 变化不破坏它们）。若 "Header 显示应用标识和版本" 等查询变得模糊，按需调整 `screen.getByText` → `screen.getAllByText(...)[0]`。

- [ ] **Step 4: 手动看一眼（dev server）**

```bash
pnpm dev
```

浏览器打开 http://localhost:5173，应该看到 "UNCONFIGURED" 灰色圆点。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): Header 增加连接状态指示器（UNCONFIGURED/CONNECTING/ONLINE/ERROR）"
```

---

## Task 2: FMO 地址管理（列表 + 新增 Dialog）

**Files:**

- Create: `src/features/settings/components/fmo-address-list.tsx`
- Create: `src/features/settings/components/fmo-address-dialog.tsx`

> 列表行：
>
> - 左：host（大） + 可选 name（小，灰）
> - 中：radio（激活项打勾）
> - 右：删除按钮（Trash2 图标）
>
> 新增 Dialog 字段：
>
> - Host（必填，文本）
> - Name（可选）
> - 提交 → `addAddress({ id: nanoid(8), host, name })`
>
> 使用 shadcn 的 `Dialog` + `Input` + `Button`（Phase 1 已装）。

- [ ] **Step 1: Dialog 组件**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/features/settings/components
```

写入 `src/features/settings/components/fmo-address-dialog.tsx`：

```tsx
import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { settingsStore } from '@/stores/settings'
import { Plus } from 'lucide-react'

export function FmoAddressDialog() {
  const [open, setOpen] = useState(false)
  const [host, setHost] = useState('')
  const [name, setName] = useState('')
  const hostValid = host.trim().length > 0

  function submit() {
    if (!hostValid) return
    settingsStore.getState().addAddress({
      id: nanoid(8),
      host: host.trim(),
      ...(name.trim() ? { name: name.trim() } : {})
    })
    setOpen(false)
    setHost('')
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          添加地址
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="hud-title text-primary">[ ADD FMO ADDRESS ]</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <label className="hud-mono text-xs text-muted-foreground">
            Host（如 <code>fmo.local</code> 或 <code>192.168.1.10:8080</code>）
          </label>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="fmo.local"
            autoFocus
          />
          <label className="hud-mono text-xs text-muted-foreground mt-2">名称（可选）</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="家里的 FMO" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={!hostValid}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: List 组件**

写入 `src/features/settings/components/fmo-address-list.tsx`：

```tsx
import { useSyncExternalStore } from 'react'
import { settingsStore, type FmoAddress } from '@/stores/settings'
import { Button } from '@/components/ui/button'
import { Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function useAddresses(): { addresses: FmoAddress[]; activeId: string | null } {
  return useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => {
      const s = settingsStore.getState()
      return { addresses: s.fmoAddresses, activeId: s.activeAddressId }
    }
  )
}

export function FmoAddressList() {
  const { addresses, activeId } = useAddresses()

  if (addresses.length === 0) {
    return (
      <div className="hud-mono text-sm text-muted-foreground py-4">
        [ NO ADDRESSES · 点"添加地址"开始 ]
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label="FMO 地址列表">
      {addresses.map((a) => {
        const isActive = a.id === activeId
        return (
          <li
            key={a.id}
            className={cn(
              'flex items-center gap-3 rounded-sm border border-border px-3 py-2',
              isActive && 'bg-primary/10 border-primary'
            )}
          >
            <button
              type="button"
              onClick={() => settingsStore.getState().setActiveAddress(a.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-border"
              aria-label={isActive ? '已激活' : `激活 ${a.host}`}
            >
              {isActive && <Check className="h-3 w-3 text-primary" />}
            </button>
            <div className="flex-1">
              <div className="hud-mono text-sm text-foreground">{a.host}</div>
              {a.name && <div className="hud-mono text-xs text-muted-foreground">{a.name}</div>}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => settingsStore.getState().removeAddress(a.id)}
              aria-label={`删除 ${a.host}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/components/
git commit -m "feat(settings): FMO 地址列表 + 新增 Dialog"
```

---

## Task 3: 呼号 + 协议 表单

**Files:**

- Create: `src/features/settings/components/callsign-field.tsx`

> 呼号输入：
>
> - 受控输入框，`onChange` 实时更新 settings store
> - 用 `isValidChineseCallsign`（Phase 2a）校验基号
> - 非法时显示红色 helper text："呼号格式不正确（示例 BA0AX 或 BA0AX-5）"
>
> 协议：Select 二选一 `ws | wss`（用 shadcn Select）

- [ ] **Step 1: CallsignField**

```tsx
import { useSyncExternalStore } from 'react'
import { settingsStore } from '@/stores/settings'
import { Input } from '@/components/ui/input'
import { isValidChineseCallsign } from '@/lib/utils/callsign'
import { cn } from '@/lib/utils'

function useCallsign(): string {
  return useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.getState().currentCallsign
  )
}

export function CallsignField() {
  const call = useCallsign()
  const empty = call.length === 0
  const valid = empty || isValidChineseCallsign(call)

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="callsign" className="hud-mono text-xs text-muted-foreground">
        登录呼号（大写，支持 SSID 后缀）
      </label>
      <Input
        id="callsign"
        value={call}
        onChange={(e) => settingsStore.getState().setCurrentCallsign(e.target.value)}
        placeholder="BA0AX 或 BA0AX-5"
        className={cn(!valid && 'border-destructive')}
        aria-invalid={!valid}
      />
      {!valid && (
        <span className="hud-mono text-xs text-destructive">
          呼号格式不正确（示例 BA0AX 或 BY4SDL-3）
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 协议 Select 直接写在 settings-view（简单够了）**

Task 4 合并掉，这里不单独建文件。

- [ ] **Step 3: Commit**

```bash
git add src/features/settings/components/callsign-field.tsx
git commit -m "feat(settings): 呼号输入（含 BY 正则校验）"
```

---

## Task 4: Settings View 组装 + 端到端

**Files:**

- Modify: `src/features/settings/settings-view.tsx`
- Create: `src/features/settings/__tests__/settings-view.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: 改写 settings-view.tsx**

```tsx
import { useSyncExternalStore } from 'react'
import { FmoAddressDialog } from './components/fmo-address-dialog'
import { FmoAddressList } from './components/fmo-address-list'
import { CallsignField } from './components/callsign-field'
import { settingsStore } from '@/stores/settings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

function useProtocol(): 'ws' | 'wss' {
  return useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.getState().protocol
  )
}

export function SettingsView() {
  const protocol = useProtocol()

  return (
    <div className="flex flex-col gap-6">
      <section className="hud-frame p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="hud-title text-primary">[ FMO ADDRESSES ]</h2>
          <FmoAddressDialog />
        </div>
        <FmoAddressList />
      </section>

      <section className="hud-frame p-6 flex flex-col gap-4">
        <h2 className="hud-title text-primary">[ IDENTITY ]</h2>
        <CallsignField />
      </section>

      <section className="hud-frame p-6 flex flex-col gap-2">
        <h2 className="hud-title text-primary">[ PROTOCOL ]</h2>
        <label className="hud-mono text-xs text-muted-foreground">
          WebSocket 协议（wss 需证书；内网 fmo.local 用 ws 即可）
        </label>
        <Select
          value={protocol}
          onValueChange={(v) => settingsStore.getState().setProtocol(v === 'wss' ? 'wss' : 'ws')}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ws">ws</SelectItem>
            <SelectItem value="wss">wss</SelectItem>
          </SelectContent>
        </Select>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: 测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/features/settings/__tests__
```

写入 `src/features/settings/__tests__/settings-view.test.tsx`：

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from '../settings-view'
import { resetSettingsForTest, settingsStore } from '@/stores/settings'

// Dialog 里用 Radix + Portal，需要容器
beforeEach(() => {
  resetSettingsForTest()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsView', () => {
  it('空状态显示占位文本', () => {
    render(<SettingsView />)
    expect(screen.getByText(/NO ADDRESSES/)).toBeInTheDocument()
  })

  it('添加地址后显示在列表中', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: /添加地址/ }))
    const hostInput = await screen.findByPlaceholderText('fmo.local')
    await user.type(hostInput, 'fmo.local')
    await user.click(screen.getByRole('button', { name: '添加' }))

    // Dialog 关闭，列表出现
    expect(screen.getByText('fmo.local')).toBeInTheDocument()
    expect(settingsStore.getState().fmoAddresses).toHaveLength(1)
  })

  it('点列表圆点激活地址', async () => {
    settingsStore.setState({
      fmoAddresses: [
        { id: '1', host: 'a.local' },
        { id: '2', host: 'b.local' }
      ],
      activeAddressId: '1'
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: '激活 b.local' }))
    expect(settingsStore.getState().activeAddressId).toBe('2')
  })

  it('删除地址', async () => {
    settingsStore.setState({
      fmoAddresses: [{ id: '1', host: 'x.local' }]
    })
    const user = userEvent.setup()
    render(<SettingsView />)

    await user.click(screen.getByRole('button', { name: '删除 x.local' }))
    expect(settingsStore.getState().fmoAddresses).toEqual([])
  })

  it('呼号非法时显示错误文本', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    const input = screen.getByLabelText(/登录呼号/)
    await user.type(input, 'INVALID')
    expect(await screen.findByText(/呼号格式不正确/)).toBeInTheDocument()
  })

  it('呼号合法时无错误文本', async () => {
    const user = userEvent.setup()
    render(<SettingsView />)
    const input = screen.getByLabelText(/登录呼号/)
    await user.type(input, 'BA0AX')
    expect(screen.queryByText(/呼号格式不正确/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 跑全量 CI**

```bash
pnpm format && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

期望：测试总数 129（Phase 3a）+ 6（settings-view） ≈ **135 个全绿**。

- [ ] **Step 4: 浏览器实机验证**

```bash
pnpm dev
```

1. 打开 http://localhost:5173/settings
2. 点"添加地址"，填 `fmo.local`，确定
3. 点列表里的圆点激活它
4. Header 从 "UNCONFIGURED" → "CONNECTING..." → "ONLINE · fmo.local"
5. 刷新页面，设置保留，自动重连

- [ ] **Step 5: 更新 README**

```markdown
- [Phase 4a · Settings + Connection UI](docs/superpowers/plans/2026-04-17-phase-4a-settings-ui.md) ✅
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: Phase 4a 完成 —— Settings 视图 + 连接状态指示"
```

---

## Phase 4a 完成验收

- ✅ Settings 页面能 CRUD FMO 地址并激活
- ✅ 呼号输入实时校验（BY 正则）
- ✅ 协议切换 `ws` / `wss`
- ✅ 配置持久化（刷新页面设置保留）
- ✅ Header 连接状态指示 4 态正确
- ✅ 从"首次访问"到"连上 fmo.local"全 UI 闭环
- ✅ `pnpm test` 全绿（新增 ~6 个 UI 测试）
- ✅ Build 产物不显著增大

Phase 4a 之后即可进入 Phase 3b（剩余 feature stores）或 Phase 4b（Logs 视图）—— Logs 视图需要先有 Phase 3b 的 `features/logs/store.ts`。
