export interface MessageSummary {
  messageId: string
  /** 发件人复合呼号（含 SSID，如 `BH6SCA-9`）。出站消息这里是自己的呼号。 */
  from: string
  /**
   * 收件人复合呼号（含 SSID）。服务端较新固件在 `getList` / `getDetail`
   * 响应里返回 `toCallsign`/`toSSID`，由 message-service 归一化进来。
   * 老固件可能缺省，此时无法判定方向，回退到"显示 from"。
   */
  to?: string
  timestamp: number
  isRead: boolean
}

export interface MessageDetail extends MessageSummary {
  /** 消息正文。对齐 FMO 服务端字段名（`message`，不是 `content`）。 */
  message: string
}

/** 服务器 message/getList 的分页响应形状。 */
export interface MessagePage {
  list: MessageSummary[]
  anchorId: number
  nextAnchorId: number
  page: number
  pageSize: number
  count: number
}
