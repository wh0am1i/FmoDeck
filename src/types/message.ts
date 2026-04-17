export interface MessageSummary {
  messageId: string
  from: string
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
