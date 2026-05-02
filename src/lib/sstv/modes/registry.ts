// src/lib/sstv/modes/registry.ts
import type { Mode } from './types'
import { robot36 } from './robot36'
import { robot72 } from './robot72'
import { martinM1 } from './martin-m1'
import { martinM2 } from './martin-m2'
import { pd120 } from './pd120'
import { scottieS1 } from './scottie-s1'
import { scottieS2 } from './scottie-s2'

/**
 * VIS 码 → Mode。只注册已实现的模式。
 * 未注册的 VIS 码会被 decoder 静默忽略(console.debug)。
 */
export const modeRegistry: ReadonlyMap<number, Mode> = new Map<number, Mode>([
  [robot36.visCode, robot36],
  [robot72.visCode, robot72],
  [martinM1.visCode, martinM1],
  [martinM2.visCode, martinM2],
  [pd120.visCode, pd120],
  [scottieS1.visCode, scottieS1],
  [scottieS2.visCode, scottieS2]
])
