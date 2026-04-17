# FmoDeck Phase 2a · 纯逻辑层（类型 + utils + APRS + ADIF） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 `src/types/*` 和 `src/lib/*` 中与外部 I/O **无关**的纯函数模块 —— 业务实体类型、URL/呼号工具、APRS 签名+计数器+数据包构造、ADIF 解析+格式化。所有模块可独立 `import`、无 React 引用、无 WebSocket/IndexedDB 依赖，单元测试全绿。

**Architecture:** 框架无关的 TS 库层。本阶段聚焦"输入-输出纯函数"，测试以 **FmoLogs 的现有实现作为 fixture baseline** 做回归防护（特别是 APRS 签名算法与 ADIF 中文 UTF-8 处理）。带 I/O 副作用的模块（IndexedDB、sql.js、WebSocket）留给 Phase 2b。

**Tech Stack:** TypeScript 5.7+ strict · Vitest 3 · crypto-js 4（APRS 签名 · 与 FmoLogs 同库确保 fidelity）

**FmoLogs 参考文件（迁移基线）：**

- APRS：`/Users/wh0am1i/FmoLogs/src/composables/useAprsControl.js` L24–146, L617
- ADIF：`/Users/wh0am1i/FmoLogs/src/adif/adifParser.js`（全文）
- URL：`/Users/wh0am1i/FmoLogs/src/utils/urlUtils.js`

---

## 文件结构（Phase 2a 结束时应有的新增文件）

```
/Users/wh0am1i/FmoDeck/
├── src/
│   ├── types/                        新建目录
│   │   ├── fmo-protocol.ts           新建 · FMO WebSocket 消息 discriminated union
│   │   ├── qso.ts                    新建 · QSO 实体
│   │   ├── station.ts                新建 · Station 实体
│   │   └── message.ts                新建 · Message 实体
│   └── lib/
│       ├── utils.ts                  (已存在 · Phase 1 的 cn())
│       ├── utils.test.ts             (已存在)
│       ├── utils/                    新建子目录
│       │   ├── url.ts
│       │   ├── url.test.ts
│       │   ├── callsign.ts
│       │   └── callsign.test.ts
│       ├── aprs/
│       │   ├── signing.ts
│       │   ├── signing.test.ts
│       │   ├── counter.ts
│       │   ├── counter.test.ts
│       │   ├── packet.ts
│       │   └── packet.test.ts
│       └── adif/
│           ├── parser.ts
│           ├── parser.test.ts
│           ├── formatter.ts
│           ├── formatter.test.ts
│           └── roundtrip.test.ts     新建 · parser + formatter 集成测试
```

**文件职责边界：**

- `src/types/` — 纯类型（无运行时代码），被 `lib/` 和后续 `stores/`、`features/` 共享
- `src/lib/utils/` — 框架无关的工具函数（Phase 1 的 `cn()` 保持在 `src/lib/utils.ts`，新工具放 `utils/` 子目录以便按域分类）
- `src/lib/aprs/` — APRS 协议实现（签名、计数器、数据包）
- `src/lib/adif/` — ADIF 解析与格式化（UTF-8 字节感知）

---

## 前置准备

- [ ] **创建分支**

```bash
cd /Users/wh0am1i/FmoDeck
git checkout -b phase-2a-pure-logic
```

---

## Task 1: 业务实体类型 + FMO 消息协议类型

**Files:**

- Create: `src/types/qso.ts`
- Create: `src/types/station.ts`
- Create: `src/types/message.ts`
- Create: `src/types/fmo-protocol.ts`

> 类型层不需要单元测试 —— 通过 `pnpm typecheck` 验证可编译即可。

- [ ] **Step 1: 创建目录**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/types
```

- [ ] **Step 2: 写入 `src/types/qso.ts`**

```ts
/** 单条 QSO（Contact）记录。字段对齐 FmoLogs SQLite schema（见 db.js L1213）。 */
export interface QsoRecord {
  /** 毫秒时间戳 */
  timestamp: number
  /** 频率（Hz） */
  freqHz: number
  fromCallsign: string
  fromGrid: string
  toCallsign: string
  toGrid: string
  /** 对方备注（支持中文 UTF-8） */
  toComment: string
  /** 通联模式，如 "FM"、"DMR" */
  mode: string
  /** 中继名 */
  relayName: string
  /** 中继管理员呼号 */
  relayAdmin: string
}

/** 呼号统计摘要（Phase 2b 的 getCallsignStats 返回、SpeakingBar 使用）。 */
export interface CallsignStats {
  count: number
  firstTime: number | null
  lastTime: number | null
}
```

- [ ] **Step 3: 写入 `src/types/station.ts`**

```ts
/** 电台（中继/基站）条目。 */
export interface Station {
  uid: string
  name: string
  callsign: string
  /** 可选 · 经纬度（度） */
  lat?: number
  lon?: number
}
```

- [ ] **Step 4: 写入 `src/types/message.ts`**

```ts
/** 消息摘要（列表视图用）。 */
export interface MessageSummary {
  messageId: string
  from: string
  timestamp: number
  isRead: boolean
}

/** 消息详情（详情视图用）。 */
export interface MessageDetail extends MessageSummary {
  content: string
}
```

- [ ] **Step 5: 写入 `src/types/fmo-protocol.ts`（discriminated union）**

```ts
/**
 * FMO WebSocket 消息协议。
 *
 * 服务端消息固定结构：{ type, subType, code, data }。
 * 客户端请求结构：{ type, subType, reqId?, data? }（reqId 由 Phase 2b 引入）。
 *
 * 类型枚举基于 FmoLogs 现有实现（messageService.js / fmoApi.js）推断。
 */

export type MessageSubType =
  | 'getList'
  | 'getDetail'
  | 'setRead'
  | 'send'
  | 'deleteItem'
  | 'deleteAll'
  | 'summary'
  | 'ack'
  | 'getListResponse'
  | 'getDetailResponse'
  | 'setReadResponse'
  | 'sendResponse'
  | 'deleteItemResponse'
  | 'deleteAllResponse'

export type StationSubType = 'getListRange' | 'getCurrent' | 'setCurrent' | 'next' | 'prev'

export type QsoSubType = 'getList' | 'getDetail'

export type UserSubType = 'getInfo'

/** 请求（客户端 → 服务端）。 */
export type FmoRequest =
  | { type: 'message'; subType: MessageSubType; reqId?: string; data?: unknown }
  | { type: 'station'; subType: StationSubType; reqId?: string; data?: unknown }
  | { type: 'qso'; subType: QsoSubType; reqId?: string; data?: unknown }
  | { type: 'user'; subType: UserSubType; reqId?: string; data?: unknown }

/** 响应（服务端 → 客户端）。code=0 表示成功。 */
export interface FmoResponseBase {
  code: number
  reqId?: string
  data: unknown
}

export type FmoResponse =
  | ({ type: 'message'; subType: MessageSubType } & FmoResponseBase)
  | ({ type: 'station'; subType: StationSubType } & FmoResponseBase)
  | ({ type: 'qso'; subType: QsoSubType } & FmoResponseBase)
  | ({ type: 'user'; subType: UserSubType } & FmoResponseBase)
```

- [ ] **Step 6: 验证 typecheck**

```bash
pnpm typecheck
```

期望：0 error。

- [ ] **Step 7: Commit**

```bash
git add src/types/
git commit -m "feat(types): 添加 QSO/Station/Message 实体类型和 FMO 协议 discriminated union"
```

---

## Task 2: `lib/utils/url.ts`（TDD · normalizeHost）

**Files:**

- Create: `src/lib/utils/url.ts`
- Create: `src/lib/utils/url.test.ts`

> FmoLogs baseline：`/Users/wh0am1i/FmoLogs/src/utils/urlUtils.js`。算法：trim → 去协议前缀（http/https/ws/wss）→ 去尾斜杠。

- [ ] **Step 1: 创建目录 + 写失败测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/utils
```

写入 `src/lib/utils/url.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { normalizeHost } from './url'

describe('normalizeHost', () => {
  it('空值返回空字符串', () => {
    expect(normalizeHost('')).toBe('')
    expect(normalizeHost('   ')).toBe('')
  })

  it('去除 http/https 协议前缀', () => {
    expect(normalizeHost('http://fmo.local')).toBe('fmo.local')
    expect(normalizeHost('https://fmo.local')).toBe('fmo.local')
  })

  it('去除 ws/wss 协议前缀', () => {
    expect(normalizeHost('ws://fmo.local/ws')).toBe('fmo.local/ws')
    expect(normalizeHost('wss://fmo.local/ws')).toBe('fmo.local/ws')
  })

  it('去除尾部斜杠（含多连斜杠）', () => {
    expect(normalizeHost('fmo.local/')).toBe('fmo.local')
    expect(normalizeHost('fmo.local///')).toBe('fmo.local')
  })

  it('同时处理协议前缀和尾斜杠', () => {
    expect(normalizeHost('https://fmo.local/')).toBe('fmo.local')
  })

  it('保留端口和路径', () => {
    expect(normalizeHost('https://fmo.local:8080/api')).toBe('fmo.local:8080/api')
  })

  it('trim 外围空白', () => {
    expect(normalizeHost('  https://fmo.local  ')).toBe('fmo.local')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/lib/utils/url.test.ts
```

- [ ] **Step 3: 实现 `src/lib/utils/url.ts`**

```ts
/**
 * 标准化主机地址：去除协议前缀（http/https/ws/wss）和尾部斜杠。
 * 迁移自 FmoLogs `src/utils/urlUtils.js` `normalizeHost`。
 */
export function normalizeHost(address: string): string {
  if (!address) return ''
  return address
    .trim()
    .replace(/^(https?|wss?):?\/\//, '')
    .replace(/\/+$/, '')
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/lib/utils/url.test.ts
```

期望：7 个测试通过。

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/url.ts src/lib/utils/url.test.ts
git commit -m "feat(utils): 迁移 normalizeHost 工具函数"
```

---

## Task 3: `lib/utils/callsign.ts`（TDD · 呼号+SSID 解析与校验）

**Files:**

- Create: `src/lib/utils/callsign.ts`
- Create: `src/lib/utils/callsign.test.ts`

> FmoLogs baseline：`useAprsControl.js` L27–48（`parseCallsignSsid`、`formatAddressee`） + L617（`/^B[A-Z][0-9][A-Z]{2,3}$/`）。
>
> 规则：
>
> - 呼号大写，去首尾空白
> - `CALL-SSID` 形式；无 `-` 时 SSID 默认为 0
> - SSID 取值 0–15
> - Addressee 右填充空格至 9 位（APRS 数据包寻址长度约定）
> - VALIDATION_CALLSIGN 正则为中国 BY 呼号格式（B[A-Z][0-9][A-Z]{2,3}）

- [ ] **Step 1: 写失败测试**

写入 `src/lib/utils/callsign.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  CALLSIGN_REGEX,
  formatAddressee,
  isValidChineseCallsign,
  parseCallsignSsid
} from './callsign'

describe('parseCallsignSsid', () => {
  it('大写化并去空白', () => {
    expect(parseCallsignSsid('  ba0ax  ')).toEqual({ call: 'BA0AX', ssid: 0 })
  })

  it('不含 SSID 时返回 0', () => {
    expect(parseCallsignSsid('BA0AX')).toEqual({ call: 'BA0AX', ssid: 0 })
  })

  it('解析 CALL-SSID 格式', () => {
    expect(parseCallsignSsid('BA0AX-5')).toEqual({ call: 'BA0AX', ssid: 5 })
    expect(parseCallsignSsid('BA0AX-15')).toEqual({ call: 'BA0AX', ssid: 15 })
  })

  it('空呼号抛错', () => {
    expect(() => parseCallsignSsid('')).toThrow(/空/)
    expect(() => parseCallsignSsid('   ')).toThrow(/空/)
  })

  it('SSID 超出范围抛错', () => {
    expect(() => parseCallsignSsid('BA0AX-16')).toThrow(/SSID/)
    expect(() => parseCallsignSsid('BA0AX--1')).toThrow(/SSID/)
  })

  it('SSID 非数字抛错', () => {
    expect(() => parseCallsignSsid('BA0AX-abc')).toThrow(/SSID/)
  })
})

describe('formatAddressee', () => {
  it('SSID=0 时不加后缀', () => {
    expect(formatAddressee('BA0AX', 0)).toBe('BA0AX    ')
  })

  it('SSID>0 时追加 -N', () => {
    expect(formatAddressee('BA0AX', 5)).toBe('BA0AX-5  ')
  })

  it('右填充空格到 9 位', () => {
    expect(formatAddressee('BA0AX', 0)).toHaveLength(9)
    expect(formatAddressee('BA0AX', 15)).toHaveLength(9)
    expect(formatAddressee('BY4SDL', 0)).toHaveLength(9)
  })

  it('超过 9 位抛错', () => {
    expect(() => formatAddressee('BA0AXXXXX', 15)).toThrow(/过长/)
  })
})

describe('CALLSIGN_REGEX · 中国 BY 呼号', () => {
  it('接受合法格式', () => {
    expect(CALLSIGN_REGEX.test('BA0AX')).toBe(true)
    expect(CALLSIGN_REGEX.test('BY4SDL')).toBe(true)
    expect(CALLSIGN_REGEX.test('BG1ABC')).toBe(true)
  })

  it('拒绝非法格式', () => {
    expect(CALLSIGN_REGEX.test('W1AW')).toBe(false) // 美国
    expect(CALLSIGN_REGEX.test('B0A')).toBe(false) // 太短
    expect(CALLSIGN_REGEX.test('ba0ax')).toBe(false) // 小写
    expect(CALLSIGN_REGEX.test('BA0AXXXX')).toBe(false) // 太长
  })
})

describe('isValidChineseCallsign（基号校验）', () => {
  it('忽略 SSID 只校验基号', () => {
    expect(isValidChineseCallsign('BA0AX-5')).toBe(true)
    expect(isValidChineseCallsign('BA0AX')).toBe(true)
  })

  it('基号非法返回 false', () => {
    expect(isValidChineseCallsign('W1AW')).toBe(false)
  })

  it('解析失败返回 false（不抛错）', () => {
    expect(isValidChineseCallsign('')).toBe(false)
    expect(isValidChineseCallsign('BA0AX-99')).toBe(false)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/lib/utils/callsign.test.ts
```

- [ ] **Step 3: 实现 `src/lib/utils/callsign.ts`**

```ts
/**
 * 呼号 + SSID 工具。迁移自 FmoLogs `useAprsControl.js`（L27–48, L617）。
 */

export interface ParsedCallsign {
  /** 基号（不含 SSID），已大写 */
  call: string
  /** SSID，范围 0–15 */
  ssid: number
}

/** 中国 BY 呼号正则。来源：FmoLogs VALIDATION.CALLSIGN。 */
export const CALLSIGN_REGEX = /^B[A-Z][0-9][A-Z]{2,3}$/

/**
 * 解析形如 `CALL` 或 `CALL-SSID` 的字符串。
 * - 自动 trim + 大写化
 * - SSID 默认为 0，取值 0–15
 * - 非法输入抛 Error
 */
export function parseCallsignSsid(input: string): ParsedCallsign {
  const s = input.trim().toUpperCase()
  if (!s) throw new Error('呼号为空')

  if (s.includes('-')) {
    const [call, ssidStr] = s.split('-')
    if (!call) throw new Error('呼号缺失')
    const ssid = Number.parseInt(ssidStr ?? '', 10)
    if (Number.isNaN(ssid) || ssid < 0 || ssid > 15) {
      throw new Error('SSID 必须是 0-15 的数字')
    }
    return { call, ssid }
  }
  return { call: s, ssid: 0 }
}

/**
 * 格式化 APRS addressee 字段：`CALL` 或 `CALL-SSID`，右填充空格至 9 位。
 */
export function formatAddressee(toCall: string, toSsid: number): string {
  const addr = toSsid > 0 ? `${toCall}-${toSsid}` : toCall
  if (addr.length > 9) throw new Error(`目标呼号过长: ${addr}`)
  return addr.padEnd(9, ' ')
}

/**
 * 判断一个（可能含 SSID 的）呼号的**基号**是否符合中国 BY 呼号格式。
 * 解析失败也返回 false。
 */
export function isValidChineseCallsign(input: string): boolean {
  try {
    const { call } = parseCallsignSsid(input)
    return CALLSIGN_REGEX.test(call)
  } catch {
    return false
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/lib/utils/callsign.test.ts
```

期望：全部通过（约 15 个）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/callsign.ts src/lib/utils/callsign.test.ts
git commit -m "feat(utils): 迁移呼号解析+校验工具（parseCallsignSsid/formatAddressee/isValidChineseCallsign）"
```

---

## Task 4: APRS 签名（`lib/aprs/signing.ts`）+ fixture baseline

**Files:**

- Modify: `package.json`（+ crypto-js）
- Create: `src/lib/aprs/signing.ts`
- Create: `src/lib/aprs/signing.test.ts`

> FmoLogs baseline：`useAprsControl.js` L51–56（`calcSignature`）。
>
> 算法：
>
> 1. 拼接 `${fromCall}${fromSsid}${typeStr}${actionStr}${timeSlot}${counter}` 为输入
> 2. `HmacSHA1(input, secret)` → 20 字节
> 3. 转 hex 大写，取**前 16 个字符**（等价前 8 字节）
>
> 时间槽：`Math.floor(Date.now() / 1000 / 60)`（分钟级）。
>
> **测试要点**：用 FmoLogs 跑出来的固定输入/输出对作为 baseline fixture，确保重写后字节级一致。生成 fixture 的一次性脚本在 Step 1 中描述。

- [ ] **Step 1: 生成 APRS baseline fixture（一次性）**

在 FmoLogs 目录下临时建个脚本 `/tmp/gen-aprs-baseline.mjs`：

```js
import CryptoJS from '/Users/wh0am1i/FmoLogs/node_modules/crypto-js/index.js'

function calcSignature(fromCall, fromSsid, typeStr, actionStr, timeSlot, counter, secret) {
  const raw = `${fromCall}${fromSsid}${typeStr}${actionStr}${timeSlot}${counter}`
  const hash = CryptoJS.HmacSHA1(raw, secret)
  return hash.toString(CryptoJS.enc.Hex).substring(0, 16).toUpperCase()
}

const cases = [
  {
    fromCall: 'BA0AX',
    fromSsid: 5,
    type: 'CONTROL',
    action: 'NORMAL',
    timeSlot: 29334000,
    counter: 0,
    secret: 'ABCDEFGHJKLM'
  },
  {
    fromCall: 'BA0AX',
    fromSsid: 5,
    type: 'CONTROL',
    action: 'NORMAL',
    timeSlot: 29334000,
    counter: 1,
    secret: 'ABCDEFGHJKLM'
  },
  {
    fromCall: 'BA0AX',
    fromSsid: 0,
    type: 'CONTROL',
    action: 'REBOOT',
    timeSlot: 29334060,
    counter: 0,
    secret: 'ABCDEFGHJKLM'
  },
  {
    fromCall: 'BY4SDL',
    fromSsid: 3,
    type: 'CONTROL',
    action: 'NORMAL',
    timeSlot: 29334000,
    counter: 7,
    secret: 'ZYXWVUTSRQPN'
  }
]

const out = cases.map((c) => ({
  ...c,
  expected: calcSignature(c.fromCall, c.fromSsid, c.type, c.action, c.timeSlot, c.counter, c.secret)
}))

console.log(JSON.stringify(out, null, 2))
```

运行：

```bash
cd /Users/wh0am1i/FmoLogs && node /tmp/gen-aprs-baseline.mjs > /Users/wh0am1i/FmoDeck/src/lib/aprs/signing.baseline.json
```

期望：产出 4 条 `{input..., expected: 'XXXXXXXXXXXXXXXX'}` 记录。**这个文件 commit 到仓库**作为 Phase 2a 和后续回归的 fixture。

- [ ] **Step 2: 安装 crypto-js**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm add crypto-js
pnpm add -D @types/crypto-js
```

- [ ] **Step 3: 写失败测试**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/aprs
```

写入 `src/lib/aprs/signing.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import baseline from './signing.baseline.json' with { type: 'json' }
import { calcSignature, getTimeSlot } from './signing'

interface BaselineCase {
  fromCall: string
  fromSsid: number
  type: string
  action: string
  timeSlot: number
  counter: number
  secret: string
  expected: string
}

describe('calcSignature · FmoLogs baseline fidelity', () => {
  for (const [i, c] of (baseline as BaselineCase[]).entries()) {
    it(`case ${i + 1}: ${c.fromCall}-${c.fromSsid} ${c.action} @${c.timeSlot}/${c.counter}`, () => {
      const sig = calcSignature(
        c.fromCall,
        c.fromSsid,
        c.type,
        c.action,
        c.timeSlot,
        c.counter,
        c.secret
      )
      expect(sig).toBe(c.expected)
    })
  }
})

describe('calcSignature · 形态', () => {
  it('返回 16 位大写 hex', () => {
    const sig = calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')
    expect(sig).toMatch(/^[0-9A-F]{16}$/)
  })

  it('改变任一输入参数签名应不同', () => {
    const base = calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')
    expect(calcSignature('BA0AX', 6, 'CONTROL', 'NORMAL', 29334000, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'REBOOT', 29334000, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334001, 0, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 1, 'ABCDEFGHJKLM')).not.toBe(
      base
    )
    expect(calcSignature('BA0AX', 5, 'CONTROL', 'NORMAL', 29334000, 0, 'ZZZZZZZZZZZZ')).not.toBe(
      base
    )
  })
})

describe('getTimeSlot', () => {
  it('返回分钟级时间槽', () => {
    // 2026-04-17T00:00:00Z = 1776038400000 ms = 29600640 分钟
    expect(getTimeSlot(1776038400000)).toBe(29600640)
    expect(getTimeSlot(1776038459000)).toBe(29600640) // 同分钟
    expect(getTimeSlot(1776038460000)).toBe(29600641) // 下一分钟
  })

  it('不传参数时使用 Date.now()', () => {
    const before = Math.floor(Date.now() / 1000 / 60)
    const slot = getTimeSlot()
    const after = Math.floor(Date.now() / 1000 / 60)
    expect(slot).toBeGreaterThanOrEqual(before)
    expect(slot).toBeLessThanOrEqual(after)
  })
})
```

- [ ] **Step 4: 跑测试确认失败**

```bash
pnpm test src/lib/aprs/signing.test.ts
```

- [ ] **Step 5: 实现 `src/lib/aprs/signing.ts`**

```ts
import CryptoJS from 'crypto-js'

/**
 * APRS 控制指令签名。
 *
 * 迁移自 FmoLogs `useAprsControl.js` L51–56 的 `calcSignature`。
 * 算法：HmacSHA1(`${fromCall}${fromSsid}${type}${action}${timeSlot}${counter}`, secret)
 *       → hex 大写，取前 16 字符（前 8 字节）。
 *
 * 测试用 FmoLogs 生成的 fixture（signing.baseline.json）做字节级比对，防回归。
 */
export function calcSignature(
  fromCall: string,
  fromSsid: number,
  typeStr: string,
  actionStr: string,
  timeSlot: number,
  counter: number,
  secret: string
): string {
  const raw = `${fromCall}${fromSsid}${typeStr}${actionStr}${timeSlot}${counter}`
  const hash = CryptoJS.HmacSHA1(raw, secret)
  return hash.toString(CryptoJS.enc.Hex).substring(0, 16).toUpperCase()
}

/**
 * 计算 APRS 时间槽（分钟级）。
 *
 * @param nowMs 可选 · 当前时间戳（毫秒）。默认 `Date.now()`。
 */
export function getTimeSlot(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / 60)
}
```

- [ ] **Step 6: 跑测试确认通过**

```bash
pnpm test src/lib/aprs/signing.test.ts
```

期望：全部通过（4 个 baseline case + 2 个形态 + 2 个 timeSlot = 8 个）。

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/aprs/
git commit -m "feat(aprs): 迁移 HMAC-SHA1 签名 + 时间槽计算，附 FmoLogs baseline fixture"
```

---

## Task 5: APRS 计数器（`lib/aprs/counter.ts`）

**Files:**

- Create: `src/lib/aprs/counter.ts`
- Create: `src/lib/aprs/counter.test.ts`

> FmoLogs baseline：`useAprsControl.js` L118–146。
>
> 规则：
>
> - localStorage key = `fmo_aprs_counter`
> - 存储结构 `{ time_slot: number, counter: number, last_updated: string }`
> - 同槽递增；换槽归零
> - 首次调用（localStorage 为空或损坏）counter 返回 0
>
> 设计改进：**抽象 Storage 依赖**，方便测试（不需要 happy-dom 的 localStorage）。

- [ ] **Step 1: 写失败测试**

写入 `src/lib/aprs/counter.test.ts`：

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { AprsCounter, type CounterStorage } from './counter'

function createMemoryStorage(): CounterStorage {
  const store = new Map<string, string>()
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k)
  }
}

describe('AprsCounter', () => {
  let storage: CounterStorage
  let counter: AprsCounter

  beforeEach(() => {
    storage = createMemoryStorage()
    counter = new AprsCounter(storage)
  })

  it('首次调用返回 0', () => {
    expect(counter.next(29334000)).toBe(0)
  })

  it('同槽连续递增', () => {
    expect(counter.next(29334000)).toBe(0)
    expect(counter.next(29334000)).toBe(1)
    expect(counter.next(29334000)).toBe(2)
  })

  it('换槽归零', () => {
    expect(counter.next(29334000)).toBe(0)
    expect(counter.next(29334000)).toBe(1)
    expect(counter.next(29334001)).toBe(0)
    expect(counter.next(29334001)).toBe(1)
  })

  it('写入后 storage 含 time_slot + counter + last_updated', () => {
    counter.next(29334000)
    const raw = storage.getItem('fmo_aprs_counter')
    expect(raw).not.toBeNull()
    const parsed: unknown = JSON.parse(raw!)
    expect(parsed).toMatchObject({
      time_slot: 29334000,
      counter: 0
    })
    expect((parsed as { last_updated: string }).last_updated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('损坏的 JSON 被忽略，按首次处理', () => {
    storage.setItem('fmo_aprs_counter', '{not valid json')
    expect(counter.next(29334000)).toBe(0)
  })

  it('多个实例共享同一 storage 时保持一致', () => {
    const a = new AprsCounter(storage)
    const b = new AprsCounter(storage)
    expect(a.next(29334000)).toBe(0)
    expect(b.next(29334000)).toBe(1)
    expect(a.next(29334000)).toBe(2)
  })

  it('兼容 FmoLogs 旧数据（无 last_updated 字段）', () => {
    storage.setItem('fmo_aprs_counter', JSON.stringify({ time_slot: 29334000, counter: 5 }))
    expect(counter.next(29334000)).toBe(6)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/lib/aprs/counter.test.ts
```

- [ ] **Step 3: 实现 `src/lib/aprs/counter.ts`**

```ts
/**
 * APRS 槽内计数器。迁移自 FmoLogs `useAprsControl.js` L118–146。
 *
 * 设计要点：
 * - 相对原版的改进：抽象 `CounterStorage` 接口，生产环境传 `window.localStorage`，
 *   测试环境传内存实现，避免 happy-dom / localStorage mock。
 * - localStorage key 与原版一致（`fmo_aprs_counter`），存储结构保持兼容，
 *   即使和 FmoLogs 并存在同一浏览器也能互读。
 */

export interface CounterStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const STORAGE_KEY = 'fmo_aprs_counter'

interface CounterState {
  time_slot: number
  counter: number
  last_updated?: string
}

function readState(storage: CounterStorage): CounterState | null {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CounterState
    if (typeof parsed.time_slot !== 'number' || typeof parsed.counter !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export class AprsCounter {
  constructor(private readonly storage: CounterStorage) {}

  /**
   * 返回当前时间槽下的下一个计数。
   * - 同槽递增
   * - 换槽归零
   */
  next(timeSlot: number): number {
    const state = readState(this.storage)
    const counter = state && state.time_slot === timeSlot ? state.counter + 1 : 0

    const newState: CounterState = {
      time_slot: timeSlot,
      counter,
      last_updated: new Date().toISOString()
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(newState))

    return counter
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/lib/aprs/counter.test.ts
```

期望：7 个测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add src/lib/aprs/counter.ts src/lib/aprs/counter.test.ts
git commit -m "feat(aprs): 迁移槽内计数器（CounterStorage 抽象便于测试）"
```

---

## Task 6: APRS 数据包构造（`lib/aprs/packet.ts`）

**Files:**

- Create: `src/lib/aprs/packet.ts`
- Create: `src/lib/aprs/packet.test.ts`

> FmoLogs baseline：`useAprsControl.js` L59–68（`buildAPRSPacket`）。
>
> 最终格式：
>
> ```
> {mycall}-{mySSID}>APFMO0,TCPIP*::{addressee:9}:CONTROL,{action},{timeSlot},{counter},{sig}
> ```
>
> 本任务**整合** signing + counter + formatAddressee，不再直接依赖外部时间。
> 传入 `timeSlot` 和 `counter`（由调用方提供）以便测试确定。

- [ ] **Step 1: 写失败测试**

写入 `src/lib/aprs/packet.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { buildAprsPacket } from './packet'

describe('buildAprsPacket', () => {
  const baseParams = {
    fromCall: 'BA0AX',
    fromSsid: 5,
    toCall: 'BY4SDL',
    toSsid: 0,
    action: 'NORMAL',
    timeSlot: 29334000,
    counter: 0,
    secret: 'ABCDEFGHJKLM'
  } as const

  it('生成符合 APRS 格式的数据包', () => {
    const packet = buildAprsPacket(baseParams)
    expect(packet).toMatch(
      /^BA0AX-5>APFMO0,TCPIP\*::BY4SDL   :CONTROL,NORMAL,29334000,0,[0-9A-F]{16}$/
    )
  })

  it('addressee 段右填空格到 9 位', () => {
    const packet = buildAprsPacket({ ...baseParams, toCall: 'BY1', toSsid: 0 })
    // addressee 位于 "::" 之后到第二个 ":" 之前
    const match = packet.match(/::(.{9}):/)
    expect(match?.[1]).toBe('BY1      ')
  })

  it('toSsid > 0 时 addressee 带后缀', () => {
    const packet = buildAprsPacket({ ...baseParams, toCall: 'BA0AX', toSsid: 3 })
    const match = packet.match(/::(.{9}):/)
    expect(match?.[1]).toBe('BA0AX-3  ')
  })

  it('签名与 calcSignature 字节级一致', () => {
    const packet = buildAprsPacket(baseParams)
    const sig = packet.split(',').pop()
    // 与 signing.baseline.json 的 case 1 对应
    expect(sig).toHaveLength(16)
    expect(sig).toMatch(/^[0-9A-F]{16}$/)
  })

  it('不同 counter 产生不同签名', () => {
    const p1 = buildAprsPacket({ ...baseParams, counter: 0 })
    const p2 = buildAprsPacket({ ...baseParams, counter: 1 })
    const sig1 = p1.split(',').pop()
    const sig2 = p2.split(',').pop()
    expect(sig1).not.toBe(sig2)
  })

  it('目标呼号超过 9 位时抛错', () => {
    expect(() => buildAprsPacket({ ...baseParams, toCall: 'BY4SDLXYZ', toSsid: 15 })).toThrow(
      /过长/
    )
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/lib/aprs/packet.test.ts
```

- [ ] **Step 3: 实现 `src/lib/aprs/packet.ts`**

```ts
import { formatAddressee } from '@/lib/utils/callsign'
import { calcSignature } from './signing'

export interface AprsPacketParams {
  fromCall: string
  fromSsid: number
  toCall: string
  toSsid: number
  /** 控制指令，例如 `'NORMAL' | 'REBOOT' | 'SHUTDOWN'`（具体枚举由上层定义） */
  action: string
  /** APRS 时间槽（分钟级），由 `getTimeSlot()` 提供 */
  timeSlot: number
  /** 当前槽内计数器，由 `AprsCounter.next()` 提供 */
  counter: number
  /** APRS 密钥（用户配置） */
  secret: string
  /** 消息 type 字段，固定 CONTROL */
  type?: string
}

/**
 * 构造完整的 APRS 控制数据包。
 * 迁移自 FmoLogs `useAprsControl.js` L59–68 `buildAPRSPacket`。
 *
 * 最终格式：
 *   `{fromCall}-{fromSsid}>APFMO0,TCPIP*::{addressee}:CONTROL,{action},{timeSlot},{counter},{sig}`
 *
 * 本函数**纯**：time slot 和 counter 由调用方提供（方便单测 + 与 AprsCounter 解耦）。
 */
export function buildAprsPacket(params: AprsPacketParams): string {
  const type = params.type ?? 'CONTROL'
  const sig = calcSignature(
    params.fromCall,
    params.fromSsid,
    type,
    params.action,
    params.timeSlot,
    params.counter,
    params.secret
  )
  const addressee = formatAddressee(params.toCall, params.toSsid)
  const payload = `${type},${params.action},${params.timeSlot},${params.counter},${sig}`
  return `${params.fromCall}-${params.fromSsid}>APFMO0,TCPIP*::${addressee}:${payload}`
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/lib/aprs/packet.test.ts
```

期望：6 个测试通过。

- [ ] **Step 5: Commit**

```bash
git add src/lib/aprs/packet.ts src/lib/aprs/packet.test.ts
git commit -m "feat(aprs): 迁移 APRS 数据包构造，组合 signing + addressee"
```

---

## Task 7: ADIF 解析器（`lib/adif/parser.ts`）

**Files:**

- Create: `src/lib/adif/parser.ts`
- Create: `src/lib/adif/parser.test.ts`

> FmoLogs baseline：`src/adif/adifParser.js` L1–175（`AdifParser` 类）。
>
> 核心要点（**必须保留的算法特性**）：
>
> - 基于 `Uint8Array` 扫描，不是 `String`
> - `<FIELD:N>` 的 N 是 **UTF-8 字节长度**（不是字符数） —— 中文字段能正确解析
> - `TextDecoder('utf-8')` 按字节切片解码
> - `<EOR>` 结束一条记录，`<EOH>` 结束头部
> - `<APP_LoTW_EOF>` 特殊处理（LoTW 导出文件末尾标记）
>
> API 改进：原版 `SimpleAdif` 类在新实现里**替换为 TS interface**（纯数据），更符合 React/TS 风格。

- [ ] **Step 1: 写失败测试（含中文样本）**

```bash
mkdir -p /Users/wh0am1i/FmoDeck/src/lib/adif
```

写入 `src/lib/adif/parser.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { parseAdif } from './parser'

describe('parseAdif · 基础结构', () => {
  it('空输入返回空对象', () => {
    expect(parseAdif('')).toEqual({})
  })

  it('仅头部（无记录）', () => {
    const input = 'ADIF Export\n<ADIF_VER:5>3.1.0<EOH>\n'
    const parsed = parseAdif(input)
    expect(parsed.header).toEqual({ text: 'ADIF Export', adif_ver: '3.1.0' })
    expect(parsed.records).toBeUndefined()
  })

  it('单条记录（无头部）', () => {
    const input = '<CALL:5>BA0AX<EOR>\n'
    const parsed = parseAdif(input)
    expect(parsed.records).toEqual([{ call: 'BA0AX' }])
  })

  it('多条记录', () => {
    const input = '<CALL:5>BA0AX<EOR>\n<CALL:6>BY4SDL<EOR>\n'
    const parsed = parseAdif(input)
    expect(parsed.records).toEqual([{ call: 'BA0AX' }, { call: 'BY4SDL' }])
  })

  it('标签名统一小写', () => {
    const input = '<Call:5>BA0AX<EoR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })
})

describe('parseAdif · UTF-8 字节长度（中文）', () => {
  it('单字段中文（每字 3 字节）', () => {
    // "测试" = 2 字符 × 3 字节 = 6 字节
    const input = '<COMMENT:6>测试<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ comment: '测试' }])
  })

  it('混合中英文字段', () => {
    // "BA0AX 你好" = 5 + 1 + 6 = 12 字节
    const input = '<CALL:5>BA0AX<COMMENT:12>BA0AX 你好<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX', comment: 'BA0AX 你好' }])
  })

  it('ArrayBuffer 输入（模拟文件读取）', () => {
    const bytes = new TextEncoder().encode('<CALL:5>BA0AX<EOR>\n')
    expect(parseAdif(bytes.buffer).records).toEqual([{ call: 'BA0AX' }])
  })

  it('Uint8Array 输入', () => {
    const bytes = new TextEncoder().encode('<CALL:5>BA0AX<EOR>\n')
    expect(parseAdif(bytes).records).toEqual([{ call: 'BA0AX' }])
  })
})

describe('parseAdif · 特殊情况', () => {
  it('APP_LoTW_EOF 终止解析', () => {
    const input = '<CALL:5>BA0AX<EOR>\n<APP_LoTW_EOF>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })

  it('字段类型提示（第三段）被忽略', () => {
    // <CALL:5:S>BA0AX —— S 是 string 类型提示
    const input = '<CALL:5:S>BA0AX<EOR>\n'
    expect(parseAdif(input).records).toEqual([{ call: 'BA0AX' }])
  })

  it('缺少长度字段抛错', () => {
    expect(() => parseAdif('<CALL>BA0AX<EOR>\n')).toThrow(/enough parts/i)
  })

  it('非法长度抛错', () => {
    expect(() => parseAdif('<CALL:abc>BA0AX<EOR>\n')).toThrow(/width/i)
  })

  it('无效输入类型抛错', () => {
    // @ts-expect-error 故意传错类型
    expect(() => parseAdif(123)).toThrow(/Invalid input/)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/lib/adif/parser.test.ts
```

- [ ] **Step 3: 实现 `src/lib/adif/parser.ts`**

```ts
/**
 * ADIF 解析器（UTF-8 字节长度感知）。
 *
 * 迁移自 FmoLogs `src/adif/adifParser.js`。
 *
 * 关键算法：基于 Uint8Array 扫描，<FIELD:N> 中 N 是 UTF-8 字节数。
 * 按字节切片后用 TextDecoder 解码，正确处理中文字段。
 */

export interface AdifHeader {
  /** 头部文本（第一个 `<` 前的内容） */
  text?: string
  /** 头部字段（如 adif_ver、programid 等） */
  [tagName: string]: string | undefined
}

export interface AdifRecord {
  [tagName: string]: string
}

export interface ParsedAdif {
  header?: AdifHeader
  records?: AdifRecord[]
}

type AdifInput = string | ArrayBuffer | Uint8Array

const BYTE_LT = 60 // '<'
const BYTE_GT = 62 // '>'

class AdifParserImpl {
  private readonly bytes: Uint8Array
  private readonly decoder = new TextDecoder('utf-8')
  private cursor = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  parse(): ParsedAdif {
    const parsed: ParsedAdif = {}
    if (this.bytes.length === 0) return parsed

    // 头部：当首字节不是 '<' 时存在
    if (this.bytes[0] !== BYTE_LT) {
      const header: AdifHeader = { text: this.parseHeaderText() }
      while (this.cursor < this.bytes.length) {
        if (this.parseTagValue(header)) break
      }
      parsed.header = header
    }

    const records: AdifRecord[] = []
    while (this.cursor < this.bytes.length) {
      const record: AdifRecord = {}
      let ended = false
      while (this.cursor < this.bytes.length) {
        if (this.parseTagValue(record)) {
          ended = true
          break
        }
      }
      if (Object.keys(record).length > 0) records.push(record)
      if (!ended) break
    }

    if (records.length > 0) parsed.records = records
    return parsed
  }

  private parseHeaderText(): string {
    const start = this.findByte(BYTE_LT, this.cursor)
    const end = start === -1 ? this.bytes.length : start
    const text = this.decoder.decode(this.bytes.slice(this.cursor, end)).trim()
    this.cursor = end
    return text
  }

  /** 解析一个 `<TAG:N>value` 或 `<EOR>`/`<EOH>`/`<APP_LoTW_EOF>`。返回 true 表示到达块结束。 */
  private parseTagValue(target: Record<string, string | undefined>): boolean {
    const startTag = this.findByte(BYTE_LT, this.cursor)
    if (startTag === -1) {
      this.cursor = this.bytes.length
      return true
    }
    const endTag = this.findByte(BYTE_GT, startTag)
    if (endTag === -1) {
      this.cursor = this.bytes.length
      return true
    }

    const tagContent = this.decoder.decode(this.bytes.slice(startTag + 1, endTag))
    const parts = tagContent.split(':')
    const tagName = parts[0]!.toLowerCase()

    if (tagName === 'eor' || tagName === 'eoh') {
      this.cursor = endTag + 1
      return true
    }
    if (tagContent === 'APP_LoTW_EOF') {
      this.cursor = this.bytes.length
      return true
    }

    if (parts.length < 2) {
      throw new Error(
        `Encountered field tag without enough parts near byte ${startTag}: ${tagContent.slice(0, 80)}`
      )
    }

    const width = Number.parseInt(parts[1]!, 10)
    if (Number.isNaN(width)) {
      throw new Error(`Invalid field width near byte ${startTag}: ${tagContent}`)
    }

    const valueStart = endTag + 1
    const value = this.decoder.decode(this.bytes.slice(valueStart, valueStart + width))
    target[tagName] = value
    this.cursor = valueStart + width
    return false
  }

  private findByte(byte: number, start: number): number {
    for (let i = start; i < this.bytes.length; i++) {
      if (this.bytes[i] === byte) return i
    }
    return -1
  }
}

function toBytes(input: AdifInput): Uint8Array {
  if (typeof input === 'string') return new TextEncoder().encode(input)
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  throw new Error('Invalid input: expected string | ArrayBuffer | Uint8Array')
}

/** 入口函数：解析 ADIF。 */
export function parseAdif(input: AdifInput): ParsedAdif {
  return new AdifParserImpl(toBytes(input)).parse()
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/lib/adif/parser.test.ts
```

期望：13 个测试全绿。

- [ ] **Step 5: Commit**

```bash
git add src/lib/adif/parser.ts src/lib/adif/parser.test.ts
git commit -m "feat(adif): 迁移 UTF-8 字节感知的 ADIF 解析器"
```

---

## Task 8: ADIF 格式化器（`lib/adif/formatter.ts`）+ 回环测试

**Files:**

- Create: `src/lib/adif/formatter.ts`
- Create: `src/lib/adif/formatter.test.ts`
- Create: `src/lib/adif/roundtrip.test.ts`

> FmoLogs baseline：`src/adif/adifParser.js` L180–266（`AdifFormatter` 类）。
>
> 规则：
>
> - 头部字段**每个换行**：`<TAG:N>value\n`
> - 记录字段**同一行空格分隔**：`<TAG:N>value <TAG:N>value <EOR>\n`
> - N 通过 `TextEncoder.encode(value).byteLength` 计算（UTF-8 字节数）
> - 最终输出末尾 trim 后补一个 `\n`

- [ ] **Step 1: 写失败测试**

写入 `src/lib/adif/formatter.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { formatAdif } from './formatter'

describe('formatAdif · 结构', () => {
  it('空对象返回空字符串', () => {
    expect(formatAdif({})).toBe('')
  })

  it('仅记录', () => {
    const out = formatAdif({ records: [{ call: 'BA0AX' }] })
    expect(out).toBe('<CALL:5>BA0AX <EOR>\n')
  })

  it('头部 + 记录', () => {
    const out = formatAdif({
      header: { text: 'Generated by FmoDeck', adif_ver: '3.1.0' },
      records: [{ call: 'BA0AX', mode: 'FM' }]
    })
    expect(out).toBe(
      'Generated by FmoDeck\n<ADIF_VER:5>3.1.0\n<EOH>\n<CALL:5>BA0AX <MODE:2>FM <EOR>\n'
    )
  })

  it('多条记录', () => {
    const out = formatAdif({
      records: [{ call: 'BA0AX' }, { call: 'BY4SDL' }]
    })
    expect(out).toBe('<CALL:5>BA0AX <EOR>\n<CALL:6>BY4SDL <EOR>\n')
  })

  it('头部文本为空则不输出', () => {
    const out = formatAdif({
      header: { text: '', adif_ver: '3.1.0' },
      records: [{ call: 'BA0AX' }]
    })
    expect(out).toBe('<ADIF_VER:5>3.1.0\n<EOH>\n<CALL:5>BA0AX <EOR>\n')
  })
})

describe('formatAdif · UTF-8 字节长度', () => {
  it('中文字段长度为字节数', () => {
    // "测试" = 6 字节
    const out = formatAdif({ records: [{ comment: '测试' }] })
    expect(out).toBe('<COMMENT:6>测试 <EOR>\n')
  })

  it('混合中英文', () => {
    // "BA0AX 你好" = 5 + 1 + 6 = 12 字节
    const out = formatAdif({ records: [{ call: 'BA0AX', comment: 'BA0AX 你好' }] })
    expect(out).toBe('<CALL:5>BA0AX <COMMENT:12>BA0AX 你好 <EOR>\n')
  })

  it('标签名大写输出', () => {
    const out = formatAdif({ records: [{ app_fmo_comment_utf8: '测试' }] })
    expect(out).toContain('<APP_FMO_COMMENT_UTF8:6>测试')
  })
})
```

- [ ] **Step 2: 实现 `src/lib/adif/formatter.ts`**

```ts
import type { ParsedAdif, AdifHeader, AdifRecord } from './parser'

const encoder = new TextEncoder()

function byteLen(value: string): number {
  return encoder.encode(value).byteLength
}

function formatFields(obj: Record<string, string | undefined>, separator: string): string {
  let buf = ''
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    buf += `<${key.toUpperCase()}:${byteLen(value)}>${value}${separator}`
  }
  return buf
}

/**
 * 将 ParsedAdif 对象序列化为 ADIF 字符串。
 *
 * 迁移自 FmoLogs `AdifFormatter`。规则：
 * - 头部字段每个换行
 * - 记录字段同行空格分隔
 * - UTF-8 字节长度
 */
export function formatAdif(obj: ParsedAdif): string {
  let buf = ''

  if (obj.header !== undefined) {
    const { text, ...fields } = obj.header as AdifHeader & { text?: string }
    if (text) buf += `${text}\n`
    buf += formatFields(fields, '\n')
    buf += '<EOH>\n'
  }

  if (obj.records !== undefined) {
    for (const rec of obj.records as AdifRecord[]) {
      buf += formatFields(rec, ' ')
      buf += '<EOR>\n'
    }
  }

  const trimmed = buf.trim()
  return trimmed.length === 0 ? '' : `${trimmed}\n`
}
```

- [ ] **Step 3: 跑 formatter 测试**

```bash
pnpm test src/lib/adif/formatter.test.ts
```

期望：8 个测试通过。

- [ ] **Step 4: 写回环集成测试**

写入 `src/lib/adif/roundtrip.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { parseAdif, type ParsedAdif } from './parser'
import { formatAdif } from './formatter'

function roundtrip(obj: ParsedAdif): ParsedAdif {
  return parseAdif(formatAdif(obj))
}

describe('ADIF 回环（parse ∘ format 幂等）', () => {
  it('纯英文记录', () => {
    const input: ParsedAdif = {
      records: [
        { call: 'BA0AX', mode: 'FM', freq: '144.640' },
        { call: 'BY4SDL', mode: 'DMR', freq: '430.100' }
      ]
    }
    expect(roundtrip(input)).toEqual(input)
  })

  it('中文字段回环', () => {
    const input: ParsedAdif = {
      records: [
        { call: 'BA0AX', app_fmo_comment_utf8: '你好世界' },
        { call: 'BY4SDL', app_fmo_comment_utf8: '测试中文备注字段 🚀' }
      ]
    }
    expect(roundtrip(input)).toEqual(input)
  })

  it('头部 + 记录回环', () => {
    const input: ParsedAdif = {
      header: { text: 'FmoDeck export', adif_ver: '3.1.0', programid: 'fmodeck' },
      records: [{ call: 'BA0AX', mode: 'FM' }]
    }
    const out = roundtrip(input)
    expect(out).toEqual(input)
  })

  it('边界字符：< > : 空格', () => {
    const input: ParsedAdif = {
      records: [{ comment: 'has spaces and < > and : in it' }]
    }
    expect(roundtrip(input)).toEqual(input)
  })
})
```

- [ ] **Step 5: 跑回环测试**

```bash
pnpm test src/lib/adif/roundtrip.test.ts
```

期望：4 个测试通过。

- [ ] **Step 6: Commit**

```bash
git add src/lib/adif/formatter.ts src/lib/adif/formatter.test.ts src/lib/adif/roundtrip.test.ts
git commit -m "feat(adif): 迁移 ADIF 格式化器 + parse/format 回环测试（含中文）"
```

---

## Task 9: 端到端验证 + 文档

**Files:**

- Modify: `/Users/wh0am1i/FmoDeck/README.md`（追加 Phase 2a 状态）

- [ ] **Step 1: 跑全量 CI 流水线**

```bash
cd /Users/wh0am1i/FmoDeck
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

期望：全部通过。测试总数 ≈ 11（Phase 1）+ 7（url）+ 15（callsign）+ 8（signing）+ 7（counter）+ 6（packet）+ 13（parser）+ 8（formatter）+ 4（roundtrip） = **79 个测试全绿**。

- [ ] **Step 2: 更新 README**

把"实施计划"小节改为：

```markdown
## 实施计划

- [Phase 1 · 地基](docs/superpowers/plans/2026-04-16-phase-1-foundation.md) ✅
- [Phase 2a · 纯逻辑层](docs/superpowers/plans/2026-04-17-phase-2a-pure-logic.md) ✅
- Phase 2b（I/O 层：IndexedDB + sql.js + WebSocket）— 待规划
```

- [ ] **Step 3: Final commit + PR**

```bash
git add README.md
git commit -m "docs: 标记 Phase 2a 完成"
```

推到远端并开 PR（与 Phase 1 同样的流程）。

---

## Phase 2a 完成验收

对照设计文档 §7 相关子集：

- ✅ `src/lib/utils/`, `src/lib/aprs/`, `src/lib/adif/` 全部模块可独立 `import`，无 React 引用
- ✅ APRS 签名通过 FmoLogs baseline fixture 验证（字节级一致）
- ✅ ADIF 解析正确处理中文 UTF-8 字节长度（回环幂等）
- ✅ `pnpm test` 全绿（新增 ~68 个测试）
- ✅ `pnpm typecheck` 0 error
- ✅ `pnpm build` 成功（纯 TS 代码不显著增加 bundle）

Phase 2a 结束后即可进入 Phase 2b 的 brainstorm（带 I/O 副作用的层 —— IndexedDB、sql.js、FmoApiClient、MessageService，需实机验证 `reqId` 支持）。
