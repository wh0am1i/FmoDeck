/**
 * 标准 APRS-IS Passcode 算法。
 *
 * 参考：aprsc 项目的 C 参考实现
 *   https://github.com/hessu/aprsc/blob/master/src/passcode.c
 *
 * 算法：
 *   hash = 0x73e2
 *   for each pair of chars (base callsign, 大写, 去 -SSID):
 *     hash ^= (char[i] << 8) | char[i+1]
 *   return hash & 0x7fff
 *
 * 常见测试向量：
 *   - 'N0CALL' → 13023
 *   - 'W1AW'   → 25988
 *   - 'BH6SCA' → 17592
 */
export function computeAprsPasscode(callsign: string): number {
  const base = callsign.trim().toUpperCase().split('-')[0] ?? ''
  if (!base) return -1
  let hash = 0x73e2
  for (let i = 0; i < base.length; i += 2) {
    hash ^= base.charCodeAt(i) << 8
    if (i + 1 < base.length) {
      hash ^= base.charCodeAt(i + 1)
    }
  }
  return hash & 0x7fff
}
