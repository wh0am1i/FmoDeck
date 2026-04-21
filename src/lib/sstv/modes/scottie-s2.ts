// src/lib/sstv/modes/scottie-s2.ts
import type { Mode } from './types'

/** Scottie S2 预留,同 S1 说明(name 是占位,见 scottie-s1.ts 注释)。 */
export const scottieS2: Mode = {
  name: 'robot36',
  displayName: 'Scottie S2',
  visCode: 0x38,
  width: 320,
  height: 256,
  lineMs: 277.692,
  decodeLine() {
    throw new Error('scottie-s2 not implemented')
  }
}
