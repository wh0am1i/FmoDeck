import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { QsoDetail, QsoSummary } from '@/types/qso'

export interface GetListAllOptions {
  /**
   * 对每条返回的记录调用；返回 true 时**立即停止**继续翻页（不含此条）。
   * 典型用法：`stopAt: r => r.timestamp < startOfTodaySec`（服务器按时间倒序返回，
   * 一旦遇到比 cutoff 更早的条目即停）。
   */
  stopAt?: (item: QsoSummary) => boolean
  /** 安全上限：默认 200 页（20 × 200 = 4000 条）。 */
  maxPages?: number
}

export class QsoService {
  constructor(private readonly api: FmoApiClient) {}

  /**
   * 拉单页（page=0, pageSize=20 固定）。主要给测试/调试用。
   */
  async getList(params: { page?: number } = {}): Promise<QsoSummary[]> {
    const data = params.page !== undefined ? { page: params.page } : undefined
    const resp = await this.api.send({
      type: 'qso',
      subType: 'getList',
      ...(data ? { data } : {})
    })
    if (resp.code !== 0) throw new Error(`qso/getList failed: code=${resp.code}`)
    const payload = resp.data as { list?: QsoSummary[] }
    return payload.list ?? []
  }

  /**
   * 循环翻页，拉取全量。
   *
   * 服务器协议（探测于 fmo.local）：
   * - 响应 `{list, page, pageSize, count}`；`pageSize` 固定 20（传其他值返空列表）
   * - 结束条件：`list.length === 0` 或 `< 20`
   * - 列表按 `timestamp DESC` 返回
   *
   * `stopAt` 可用于 early-break（比如 `syncMode: 'today'`）避免拉取历史页。
   */
  async getListAll(options: GetListAllOptions = {}): Promise<QsoSummary[]> {
    const maxPages = options.maxPages ?? 200
    const PAGE_SIZE = 20
    const all: QsoSummary[] = []

    for (let page = 0; page < maxPages; page++) {
      const resp = await this.api.send({
        type: 'qso',
        subType: 'getList',
        data: { page }
      })
      if (resp.code !== 0) throw new Error(`qso/getList failed: code=${resp.code}`)
      const payload = resp.data as { list?: QsoSummary[] }
      const list = payload.list ?? []
      if (list.length === 0) break

      if (options.stopAt) {
        let stopped = false
        for (const item of list) {
          if (options.stopAt(item)) {
            stopped = true
            break
          }
          all.push(item)
        }
        if (stopped) break
      } else {
        all.push(...list)
      }

      if (list.length < PAGE_SIZE) break
    }

    return all
  }

  async getDetail(logId: number): Promise<QsoDetail> {
    const resp = await this.api.send({
      type: 'qso',
      subType: 'getDetail',
      data: { logId }
    })
    if (resp.code !== 0) throw new Error(`qso/getDetail failed: code=${resp.code}`)
    const data = resp.data as { log: QsoDetail }
    return data.log
  }
}
