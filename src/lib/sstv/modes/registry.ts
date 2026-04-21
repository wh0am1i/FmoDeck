// src/lib/sstv/modes/registry.ts
import type { Mode } from './types'
import { robot36 } from './robot36'
import { martinM1 } from './martin-m1'
import { martinM2 } from './martin-m2'

/**
 * VIS 码 → Mode。只注册已实现的模式。
 * 未注册的 VIS 码会被 decoder 静默忽略(console.debug)。
 *
 * 扩展:实现 Scottie 后,加入 scottieS1 / scottieS2(先扩 types.ts 的 name 联合类型)。
 */
export const modeRegistry: ReadonlyMap<number, Mode> = new Map<number, Mode>([
  [robot36.visCode, robot36],
  [martinM1.visCode, martinM1],
  [martinM2.visCode, martinM2]
])
