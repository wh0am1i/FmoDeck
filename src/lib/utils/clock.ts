function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** UTC 时间 HH:MM:SS。 */
export function formatUtcTime(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
}

/** 本地时间 HH:MM:SS。 */
export function formatLocalTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
