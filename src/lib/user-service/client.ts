import type { FmoApiClient } from '@/lib/fmo-api/client'

/**
 * `type:'user', subType:'getInfo'` 响应形状。
 * 实测服务端 `callsign` 字段已是复合形式（`BH6SCA-9`），少数固件可能只返回基号。
 */
export interface UserInfo {
  callsign: string
  uid?: number
  wlanIP?: string
}

export class UserService {
  constructor(private readonly api: FmoApiClient) {}

  async getInfo(): Promise<UserInfo> {
    const resp = await this.api.send({ type: 'user', subType: 'getInfo' })
    if (resp.code !== 0) throw new Error(`user/getInfo failed: code=${resp.code}`)
    return resp.data as UserInfo
  }
}
