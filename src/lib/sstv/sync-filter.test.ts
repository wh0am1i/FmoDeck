import { describe, it, expect } from 'vitest'
import { hampelFilter } from './sync-filter'

describe('hampelFilter', () => {
  it('空窗口返回 0', () => {
    expect(hampelFilter([])).toBe(0)
  })

  it('单元素 / 双元素窗口直接返回 latest(不够算 MAD)', () => {
    expect(hampelFilter([3])).toBe(3)
    expect(hampelFilter([3, 7])).toBe(7)
  })

  it('窗口全相同(MAD=0)且 latest 无变化 → 返回 latest', () => {
    expect(hampelFilter([2, 2, 2, 2, 2])).toBe(2)
  })

  it('窗口全相同(MAD=0)但 latest 大跳变 → 仍按异常处理(MIN_THRESHOLD 兜底)', () => {
    // 4 个稳定值后突然跳一个大异常:中位数=1, MAD=0, 阈值=MIN_THRESHOLD=1.5
    // |50-1|=49 > 1.5 → 返回中位数 1
    expect(hampelFilter([1, 1, 1, 1, 50])).toBe(1)
  })

  it('稳定噪声中孤立异常被替换为中位数', () => {
    // sorted=[1,1,2,2,20], 中位数=2, deviations sorted=[0,0,1,1,18], MAD=1
    // 阈值=max(3×1.4826×1, 1.5)≈4.45;|20-2|=18 > 4.45 → 返回中位数 2
    expect(hampelFilter([1, 2, 1, 2, 20])).toBe(2)
  })

  it('真实漂移序列 latest 通过(不再台阶化)', () => {
    // 缓慢漂移:0,0.5,1,1.5,2 → 中位数=1,MAD=median(1,0.5,0,0.5,1)=0.5
    // 阈值=max(3×1.4826×0.5, 1.5)=2.22;|2-1|=1 < 2.22 → 通过,返回 latest=2
    expect(hampelFilter([0, 0.5, 1, 1.5, 2])).toBe(2)
  })

  it('多个异常值并存时仍能识别新异常', () => {
    // 旧异常进了窗口:[1, 2, 1, 99, 100]
    // 中位数 = 2(99/100 是异常但不影响中位数)
    // MAD = median(|1-2|,|2-2|,|1-2|,|99-2|,|100-2|) = median(1,0,1,97,98) = 1
    // 阈值 ≈ 4.45;latest=100,|100-2|=98 > 4.45 → 异常,返回中位数 2
    expect(hampelFilter([1, 2, 1, 99, 100])).toBe(2)
  })

  it('窗口长度可以是任意正数(不限定 5)', () => {
    expect(hampelFilter([1, 1, 1, 1, 1, 1, 1, 50])).toBe(1)
  })
})
