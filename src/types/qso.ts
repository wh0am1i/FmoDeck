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

/**
 * 本地持久化 QSO（来自 ADIF 导入）。
 * 存储到 IndexedDB 的 `local_qsos` store。
 */
export interface LocalQso {
  /** 本地唯一 ID。 */
  id: string
  /** Unix 秒（UTC）。 */
  timestamp: number
  toCallsign: string
  grid: string
  /** 完整 ADIF 字段（原样保留，便于重新导出）。字段名小写。 */
  fields: Record<string, string>
}
