export interface QsoRecord {
  timestamp: number
  freqHz: number
  fromCallsign: string
  fromGrid: string
  toCallsign: string
  toGrid: string
  toComment: string
  mode: string
  relayName: string
  relayAdmin: string
}

export interface CallsignStats {
  count: number
  firstTime: number | null
  lastTime: number | null
}
