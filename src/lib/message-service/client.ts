import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { MessageDetail, MessagePage, MessageSummary } from '@/types/message'

type Unsub = () => void

export class MessageService {
  constructor(private readonly api: FmoApiClient) {}

  /**
   * 返回分页响应。服务器返回 `{list, anchorId, nextAnchorId, page, pageSize, count}`。
   */
  async getList(params: { anchorId?: number; pageSize?: number } = {}): Promise<MessagePage> {
    const resp = await this.api.send({ type: 'message', subType: 'getList', data: params })
    if (resp.code !== 0) throw new Error(`getList failed: code=${resp.code}`)
    return resp.data as MessagePage
  }

  async getDetail(messageId: string): Promise<MessageDetail> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'getDetail',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`getDetail failed: code=${resp.code}`)
    const data = resp.data as { message?: MessageDetail } | MessageDetail
    if (data && typeof data === 'object' && 'message' in data && data.message) {
      return data.message
    }
    return data as MessageDetail
  }

  async setRead(messageId: string): Promise<void> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'setRead',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`setRead failed: code=${resp.code}`)
  }

  async send(callsign: string, ssid: number, message: string): Promise<void> {
    // FMO 服务端期望 { callsign, ssid, message }（对齐 FmoLogs 实现）。
    const resp = await this.api.send({
      type: 'message',
      subType: 'send',
      data: { callsign, ssid, message }
    })
    if (resp.code !== 0) throw new Error(`send failed: code=${resp.code}`)
  }

  async deleteItem(messageId: string): Promise<void> {
    const resp = await this.api.send({
      type: 'message',
      subType: 'deleteItem',
      data: { messageId }
    })
    if (resp.code !== 0) throw new Error(`deleteItem failed: code=${resp.code}`)
  }

  async deleteAll(): Promise<void> {
    const resp = await this.api.send({ type: 'message', subType: 'deleteAll' })
    if (resp.code !== 0) throw new Error(`deleteAll failed: code=${resp.code}`)
  }

  /** 订阅新消息摘要推送（服务端 `{type:'message', subType:'summary'}`）。 */
  onSummary(cb: (summary: MessageSummary) => void): Unsub {
    return this.api.onPush((msg) => {
      if (msg.type === 'message' && msg.subType === 'summary') {
        cb(msg.data as MessageSummary)
      }
    })
  }
}
