import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { Station } from '@/types/station'

/**
 * fmo.local 的 Station API 返回的"中继/基站"摘要（与 src/types/station.ts 的 Station 区分：
 * 服务器版用 number uid，业务层 Station 用 string uid 以兼容其他来源）。
 */
export interface ServerStation {
  uid: number
  name: string
}

export interface GetListAllOptions {
  pageSize?: number
  maxPages?: number
}

export class StationService {
  constructor(private readonly api: FmoApiClient) {}

  async getCurrent(): Promise<ServerStation> {
    const resp = await this.api.send({ type: 'station', subType: 'getCurrent' })
    if (resp.code !== 0) throw new Error(`station/getCurrent failed: code=${resp.code}`)
    return resp.data as ServerStation
  }

  /**
   * 循环 `getListRange(start, count)` 拉取全部 station。
   * 结束条件：`list.length === 0` 或 `< pageSize`。
   */
  async getListAll(options: GetListAllOptions = {}): Promise<ServerStation[]> {
    const pageSize = options.pageSize ?? 20
    const maxPages = options.maxPages ?? 50
    const all: ServerStation[] = []

    for (let i = 0; i < maxPages; i++) {
      const resp = await this.api.send({
        type: 'station',
        subType: 'getListRange',
        data: { start: i * pageSize, count: pageSize }
      })
      if (resp.code !== 0) {
        throw new Error(`station/getListRange failed: code=${resp.code}`)
      }
      const payload = resp.data as { list?: ServerStation[] }
      const list = payload.list ?? []
      if (list.length === 0) break
      all.push(...list)
      if (list.length < pageSize) break
    }

    return all
  }

  async setCurrent(uid: number): Promise<void> {
    const resp = await this.api.send({
      type: 'station',
      subType: 'setCurrent',
      data: { uid }
    })
    if (resp.code !== 0) throw new Error(`station/setCurrent failed: code=${resp.code}`)
  }

  async next(): Promise<void> {
    const resp = await this.api.send({ type: 'station', subType: 'next' })
    if (resp.code !== 0) throw new Error(`station/next failed: code=${resp.code}`)
  }

  async prev(): Promise<void> {
    const resp = await this.api.send({ type: 'station', subType: 'prev' })
    if (resp.code !== 0) throw new Error(`station/prev failed: code=${resp.code}`)
  }
}

/** 把服务器 `ServerStation` 转为业务层 `Station`（uid 变字符串便于与其他来源合并）。 */
export function toStation(s: ServerStation): Station {
  return {
    uid: String(s.uid),
    name: s.name,
    callsign: ''
  }
}
