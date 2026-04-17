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
    // 服务器返回两种可能形状：
    //   A. { message: { ...detail, message: "正文" } }（嵌套在 wrapper 里）
    //   B. { ...detail, message: "正文" }（扁平）
    // MessageDetail 自己也有个 `message` 字段（正文）。用"嵌套对象"来区分
    // wrapper vs 扁平：wrapper.message 是 object，detail.message 是 string。
    const data = resp.data as { message?: unknown } & Partial<MessageDetail>
    if (data && typeof data === 'object' && typeof data.message === 'object' && data.message !== null) {
      return data.message as MessageDetail
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
