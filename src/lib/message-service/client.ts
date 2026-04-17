import type { FmoApiClient } from '@/lib/fmo-api/client'
import { parseCallsignSsid } from '@/lib/utils/callsign'
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

  async send(to: string, content: string): Promise<void> {
    // FMO 服务端期望 { callsign, ssid, message }，不是 { to, content }。
    // 传入的 `to` 可能形如 "BA0AX" 或 "BA0AX-5"，在这里拆开。
    const { call, ssid } = parseCallsignSsid(to)
    const resp = await this.api.send({
      type: 'message',
      subType: 'send',
      data: { callsign: call, ssid, message: content }
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
