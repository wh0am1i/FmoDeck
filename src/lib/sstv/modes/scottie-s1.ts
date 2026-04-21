// src/lib/sstv/modes/scottie-s1.ts
import type { Mode } from './types'

/**
 * Scottie S1 预留。结构与 Martin 不同:扫描顺序是 G → B → hsync → R,
 * sync 在行尾而非行首,跨行 state 需要保留"上一行末 sync 位置"。
 * 本次不实现,registry 里也不注册。
 *
 * name 字段暂填 'robot36' 作为占位 —— 真正实现 Scottie 时要先扩展
 * types.ts 的 name 联合类型,再改这里。
 */
export const scottieS1: Mode = {
  name: 'robot36',
  displayName: 'Scottie S1',
  visCode: 0x3c,
  width: 320,
  height: 256,
  lineMs: 428.22,
  decodeLine() {
    throw new Error('scottie-s1 not implemented')
  }
}
