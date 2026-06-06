export interface NavItem {
  to: string
  /** i18n key（nav.*）。与 label 二选一。 */
  labelKey?: string
  /** 硬编码文本,不走 i18n。 */
  label?: string
}

const ENABLE_APRS = import.meta.env.VITE_ENABLE_APRS !== 'false'

/** 全部页面入口。Nav 与首页 ☰ 菜单共用。 */
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/logs', labelKey: 'nav.logs' },
  { to: '/top20', labelKey: 'nav.top20' },
  { to: '/old-friends', labelKey: 'nav.oldFriends' },
  { to: '/messages', labelKey: 'nav.messages' },
  { to: '/spectrum', labelKey: 'nav.spectrum' },
  { to: '/control', labelKey: 'nav.control' },
  ...(ENABLE_APRS ? [{ to: '/aprs', labelKey: 'nav.aprs' }] : []),
  { to: '/sstv', label: 'SSTV' },
  { to: '/settings', labelKey: 'nav.settings' }
]
