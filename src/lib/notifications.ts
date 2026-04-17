/**
 * 桌面通知（Notification API）轻封装。
 *
 * 行为：
 * - 只在 `document.visibilityState === 'hidden'` 或窗口失焦时弹，避免在用户
 *   正在看页面时打扰（toast 已经能看见）
 * - 浏览器不支持或用户未授权时静默失败
 */

export type SupportedPermission = NotificationPermission | 'unsupported'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function currentPermission(): SupportedPermission {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<SupportedPermission> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** 用户在后台时发一条通知。页面可见且聚焦时什么都不做。 */
export function notify(title: string, body: string, icon = '/icon.svg'): void {
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted') return
  const hidden = document.visibilityState === 'hidden'
  const focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true
  if (!hidden && focused) return
  try {
    new Notification(title, { body, icon, silent: false })
  } catch {
    /* iOS PWA / Safari 偶发抛错，忽略 */
  }
}
