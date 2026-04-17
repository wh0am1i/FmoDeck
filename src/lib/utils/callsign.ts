export interface ParsedCallsign {
  call: string
  ssid: number
}

export const CALLSIGN_REGEX = /^B[A-Z][0-9][A-Z]{2,3}$/

export function parseCallsignSsid(input: string): ParsedCallsign {
  const s = input.trim().toUpperCase()
  if (!s) throw new Error('呼号为空')

  if (s.includes('-')) {
    const [call, ssidStr] = s.split('-')
    if (!call) throw new Error('呼号缺失')
    const ssid = Number.parseInt(ssidStr ?? '', 10)
    if (Number.isNaN(ssid) || ssid < 0 || ssid > 15) {
      throw new Error('SSID 必须是 0-15 的数字')
    }
    return { call, ssid }
  }
  return { call: s, ssid: 0 }
}

export function formatAddressee(toCall: string, toSsid: number): string {
  const addr = toSsid > 0 ? `${toCall}-${toSsid}` : toCall
  if (addr.length > 9) throw new Error(`目标呼号过长: ${addr}`)
  return addr.padEnd(9, ' ')
}

export function isValidChineseCallsign(input: string): boolean {
  try {
    const { call } = parseCallsignSsid(input)
    return CALLSIGN_REGEX.test(call)
  } catch {
    return false
  }
}
