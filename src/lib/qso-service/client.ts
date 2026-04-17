import type { FmoApiClient } from '@/lib/fmo-api/client'
import type { QsoDetail, QsoSummary } from '@/types/qso'

export class QsoService {
  constructor(private readonly api: FmoApiClient) {}

  async getList(): Promise<QsoSummary[]> {
    const resp = await this.api.send({ type: 'qso', subType: 'getList' })
    if (resp.code !== 0) throw new Error(`qso/getList failed: code=${resp.code}`)
    const data = resp.data as { list?: QsoSummary[] }
    return data.list ?? []
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
