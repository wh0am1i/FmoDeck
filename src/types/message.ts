export interface MessageSummary {
  messageId: string
  from: string
  timestamp: number
  isRead: boolean
}

export interface MessageDetail extends MessageSummary {
  content: string
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
