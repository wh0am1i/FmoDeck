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

/** 服务器 qso/getList 响应的摘要项（字段精简，timestamp 为 Unix 秒）。 */
export interface QsoSummary {
  logId: number
  timestamp: number
  toCallsign: string
  grid: string
}

/** 服务器 qso/getDetail 响应的完整字段（含 logId + Unix 秒 timestamp）。 */
export interface QsoDetail extends QsoRecord {
  logId: number
}
