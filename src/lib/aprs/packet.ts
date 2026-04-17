import { formatAddressee } from '@/lib/utils/callsign'
import { calcSignature } from './signing'

export interface AprsPacketParams {
  fromCall: string
  fromSsid: number
  toCall: string
  toSsid: number
  action: string
  timeSlot: number
  counter: number
  secret: string
  type?: string
}

export function buildAprsPacket(params: AprsPacketParams): string {
  const type = params.type ?? 'CONTROL'
  const sig = calcSignature(
    params.fromCall,
    params.fromSsid,
    type,
    params.action,
    params.timeSlot,
    params.counter,
    params.secret
  )
  const addressee = formatAddressee(params.toCall, params.toSsid)
  const payload = `${type},${params.action},${params.timeSlot},${params.counter},${sig}`
  return `${params.fromCall}-${params.fromSsid}>APFMO0,TCPIP*::${addressee}:${payload}`
}
