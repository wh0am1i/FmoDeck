/**
 * semver 主.次.修订三段比较。返回值符号约定:
 *   < 0   a < b
 *   === 0 相等
 *   > 0   a > b
 *   NaN   任一侧格式非法
 *
 * 仅支持 "x.y.z" 或 "vx.y.z",不处理 prerelease/build metadata。
 * 项目只发 stable tag,够用。
 */
export function compareVersion(a: string, b: string): number {
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return NaN
  const [a0, a1, a2] = pa
  const [b0, b1, b2] = pb
  if (a0 !== b0) return a0 - b0
  if (a1 !== b1) return a1 - b1
  return a2 - b2
}

function parse(v: string): [number, number, number] | null {
  const m = v.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}
