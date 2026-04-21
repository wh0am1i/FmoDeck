// src/lib/sstv/modes/registry.ts
import type { Mode } from './types'
import { robot36 } from './robot36'
import { martinM1 } from './martin-m1'
import { martinM2 } from './martin-m2'

/**
 * VIS 码 → Mode。只注册已实现的模式。
 * 未注册的 VIS 码会被 decoder 静默忽略(console.debug)。
 *
 * Scottie S1/S2 (VIS 0x3c / 0x38) 预留:
 *   1. 扩展 types.ts 的 Mode.name 联合类型加 'scottie-s1' | 'scottie-s2'
 *   2. 扩展 src/types/sstv.ts 的 SstvMode 同步
 *   3. 新建 modes/scottie-s1.ts / scottie-s2.ts 实现 Mode 接口(注意 Scottie
 *      sync 位置在行尾,跨行 state 需要保留上一行 sync 锚点)
 *   4. 在本 registry 里追加 [scottieS1.visCode, scottieS1] 等注册
 */
export const modeRegistry: ReadonlyMap<number, Mode> = new Map<number, Mode>([
  [robot36.visCode, robot36],
  [martinM1.visCode, martinM1],
  [martinM2.visCode, martinM2]
])
