/**
 * Hampel filter:孤立异常用中位数替换,正常值原样通过。
 *
 * 用于 SSTV 行 sync 偏移序列。原本所有 mode 都是「滑窗中位数」:
 *   sorted[mid]
 * —— 它的副作用是每 N 行才让中位数跳一次,真实 slant 缓变时画面出现 N-行台阶。
 *
 * Hampel 思路:
 *   1) 算窗口中位数 m
 *   2) 算 MAD = median(|x_i - m|)
 *   3) 阈值 = max(3 × 1.4826 × MAD, MIN_THRESHOLD)
 *      (1.4826 把 MAD 修正为正态分布下的 σ 估计;
 *       MIN_THRESHOLD 兜住 MAD=0 时的退化情况——窗口里大部分值相同的话
 *       MAD 会等于 0,阈值塌成 0 会把任何变化都判成异常)
 *   4) 若 |latest - m| > 阈值 → 异常,返回 m;否则返回 latest
 *
 * 这样:
 *   - 单行 sync 检测抖动(±2ms 噪声)被过滤
 *   - 真实 slant 漂移 / 行间合理变化 → 直接通过,不再台阶化
 *   - MAD=0 + 大跳变(异常)仍被识别(MIN_THRESHOLD 兜底)
 */
const MIN_THRESHOLD = 1.5 // ms,允许的最小漂移幅度,小于它一律放行

export function hampelFilter(window: readonly number[]): number {
  const n = window.length
  if (n === 0) return 0
  const latest = window[n - 1]!
  // 样本太少时无法稳健估 MAD,直接放行
  if (n < 3) return latest

  const sorted = [...window].sort((a, b) => a - b)
  const median = sorted[Math.floor(n / 2)]!

  const deviations: number[] = []
  for (const v of window) deviations.push(Math.abs(v - median))
  deviations.sort((a, b) => a - b)
  const mad = deviations[Math.floor(n / 2)]!

  const threshold = Math.max(3 * 1.4826 * mad, MIN_THRESHOLD)
  return Math.abs(latest - median) > threshold ? median : latest
}
