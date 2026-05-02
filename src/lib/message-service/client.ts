import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { MessageDetail, MessagePage, MessageSummary } from '@/types/message'

type Unsub = () => void

/**
 * 服务端两种历史形状：
 * - 老：`{messageId, from, timestamp, isRead}` —— 复合 `from` 已是 `BH6SCA-9` 形式
 * - 新：`{messageId, fromCallsign, fromSSID, toCallsign, toSSID?, timestamp, read}`
 * 这里统一吃下，输出 `MessageSummary`（保留 from 复合，附加可选 to 复合）。
 */
interface RawSummary {
  messageId: string
  from?: string
  fromCallsign?: string
  fromSSID?: number
  to?: string
  toCallsign?: string
  toSSID?: number
  timestamp: number
  isRead?: boolean
  read?: number | boolean
  message?: string
}

function toComposite(call: string, ssid?: number): string {
  return ssid && ssid > 0 ? `${call}-${ssid}` : call
}

function normalizeSummary(raw: RawSummary): MessageSummary {
  const from = raw.from ?? toComposite(raw.fromCallsign ?? '', raw.fromSSID)
  const toCallRaw = raw.to ?? raw.toCallsign
  const to = toCallRaw ? toComposite(toCallRaw, raw.toSSID) : undefined
  const isRead =
    typeof raw.isRead === 'boolean'
      ? raw.isRead
      : typeof raw.read === 'boolean'
        ? raw.read
        : raw.read === 1
  return {
    messageId: raw.messageId,
    from,
    ...(to ? { to } : {}),
    timestamp: raw.timestamp,
    isRead
  }
}

function normalizeDetail(raw: RawSummary): MessageDetail {
  return {
    ...normalizeSummary(raw),
    message: raw.message ?? ''
  }
}

export class MessageService {
  constructor(private readonly api: FmoApiClient) {}

  /**
   * 返回分页响应。服务器返回 `{list, anchorId, nextAnchorId, page, pageSize, count}`。
   */
  async getList(params: { anchorId?: number; pageSize?: number } = {}): Promise<MessagePage> {
    const resp = await this.api.send({ type: 'message', subType: 'getList', data: params })
    if (resp.code !== 0) throw new Error(`getList failed: code=${resp.code}`)
    const page = resp.data as MessagePage & { list: RawSummary[] }
    return { ...page, list: page.list.map(normalizeSummary) }
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
    const data = resp.data as { message?: unknown } & RawSummary
    if (
      data &&
      typeof data === 'object' &&
      typeof data.message === 'object' &&
      data.message !== null
    ) {
      return normalizeDetail(data.message as RawSummary)
    }
    return normalizeDetail(data)
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
        cb(normalizeSummary(msg.data as RawSummary))
      }
    })
  }
}
