/**
 * 升级服务器 latest.json 契约。见
 * docs/superpowers/specs/2026-04-19-android-signing-updater-design.md
 */
export interface LatestManifest {
  version: string
  url: string
  sha256: string
  size: number
  notes: string
  publishedAt: string
  minVersion?: string | null
}
