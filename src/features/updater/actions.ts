import { downloadApkToCache } from './download'
import { installApk } from './install'
import { updaterStore } from './store'

/**
 * 启动下载流程。store 已在 available 状态,manifest 非空时调用。
 * 进度写回 store,完成后 state → ready。
 */
export async function startDownload(abortSignal: AbortSignal): Promise<void> {
  const s = updaterStore.getState()
  const m = s.manifest
  if (!m) return
  s.setDownloading()
  try {
    const path = await downloadApkToCache(
      m.url,
      m.sha256,
      m.size,
      (r) => updaterStore.getState().setProgress(r),
      abortSignal
    )
    updaterStore.getState().setReady(path)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/abort/i.test(msg)) {
      // 用户取消 → 回到 available 状态,不是 error
      updaterStore.setState({ state: 'available', progress: 0 })
      return
    }
    updaterStore.getState().setError(msg)
  }
}

export async function startInstall(): Promise<void> {
  const s = updaterStore.getState()
  if (!s.downloadedPath) return
  s.setInstalling()
  try {
    await installApk(s.downloadedPath)
    // 成功后系统会杀掉 app,state 不用清
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    updaterStore.getState().setError(msg)
  }
}
