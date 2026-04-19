/**
 * 平台检测工具。Tauri 2 WebView 在 window 上注入 __TAURI_INTERNALS__;
 * Android 用 userAgent 嗅探(Tauri Android 的 WebView 是 Chrome,UA 里有 "Android")。
 *
 * Android === Tauri + userAgent.Android。不是在浏览器打开的 Android 手机页。
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function isAndroid(): boolean {
  if (!isTauri()) return false
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}
