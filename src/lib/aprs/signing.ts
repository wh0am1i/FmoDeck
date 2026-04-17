import CryptoJS from 'crypto-js'

export function calcSignature(
  fromCall: string,
  fromSsid: number,
  typeStr: string,
  actionStr: string,
  timeSlot: number,
  counter: number,
  secret: string
): string {
  const raw = `${fromCall}${fromSsid}${typeStr}${actionStr}${timeSlot}${counter}`
  const hash = CryptoJS.HmacSHA1(raw, secret)
  return hash.toString(CryptoJS.enc.Hex).substring(0, 16).toUpperCase()
}

export function getTimeSlot(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / 60)
}
