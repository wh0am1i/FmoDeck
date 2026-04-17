export interface MessageSummary {
  messageId: string
  from: string
  timestamp: number
  isRead: boolean
}

export interface MessageDetail extends MessageSummary {
  content: string
}
