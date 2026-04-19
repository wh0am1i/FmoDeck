import { isAndroid } from '@/lib/utils/platform'

/**
 * 调 Rust install_apk 命令,由原生侧起 ACTION_VIEW 调起系统包安装器。
 * 非 Android 抛错(上层 UI 不会触达)。
 */
export async function installApk(path: string): Promise<void> {
  if (!isAndroid()) {
    throw new Error('install_apk only available on Android')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke<void>('install_apk', { path })
}
