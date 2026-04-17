/**
 * 在两种运行环境下"打开外链"：
 * - 浏览器：`window.open(url, '_blank')`
 * - Tauri 桌面壳：走 opener 插件调用系统默认浏览器
 *
 * 纯浏览器版本的 app 用普通 `<a target="_blank">` 就够了，但 Tauri 2
 * 的 WebView 默认会拦截 `target="_blank"` 导航（不是跳转也不是新开），
 * 所以链接要走 onClick → openExternal。
 */

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    // 动态 import 避免浏览器端打包无谓的 Tauri 代码
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
