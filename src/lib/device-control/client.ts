import type { FmoApiClient } from '@/lib/fmo-api/client'

/**
 * 设备本地控制（通过 fmo.local 的 `/ws` 直接控制设备屏幕/服务）。
 *
 * 与 APRS 远程控制（`lib/aprs-gateway/client.ts`）并列的替代方案：
 * - 本地：必须和设备同一局域网，无需签名 / passcode / 网关
 * - 远程：走 APRS-IS，需要签名，能跨网络
 */
export class DeviceControlService {
  constructor(private readonly api: FmoApiClient) {}

  /**
   * 切屏幕模式：
   * - 0 = 普通模式
   * - 1 = 待机模式
   */
  async setScreenMode(mode: 0 | 1): Promise<void> {
    const resp = await this.api.send({
      type: 'ui',
      subType: 'setScreenMode',
      data: { mode }
    })
    if (resp.code !== 0) {
      throw new Error(`setScreenMode failed: code=${resp.code}`)
    }
  }

  /**
   * 重启 APRS 服务（设备侧，非硬件 reboot）。
   * 响应 data 形如 `{result: 0}`。
   */
  async restartAprsService(): Promise<void> {
    const resp = await this.api.send({
      type: 'config',
      subType: 'restartAprsService',
      data: {}
    })
    if (resp.code !== 0) {
      throw new Error(`restartAprsService failed: code=${resp.code}`)
    }
  }
}
