import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { sstvStore } from '@/features/sstv/store'

interface NavItem {
  to: string
  /** i18n key（nav.*）。与 label 二选一。 */
  labelKey?: string
  /** 硬编码文本,不走 i18n。 */
  label?: string
}

const ENABLE_APRS = import.meta.env.VITE_ENABLE_APRS !== 'false'

const items: readonly NavItem[] = [
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

export function Nav() {
  const { t } = useTranslation()
  const unreadSstv = sstvStore((s) => s.unreadCount)
  return (
    <nav
      aria-label="主导航"
      className="hud-frame flex gap-0 overflow-x-auto bg-card/50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'hud-mono hud-title whitespace-nowrap px-3 py-2 text-sm transition-colors sm:px-4',
              'flex-shrink-0 border-r border-border last:border-r-0',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            )
          }
        >
          {item.labelKey ? t(item.labelKey) : item.label}
          {item.to === '/sstv' && unreadSstv > 0 && (
            <span
              aria-hidden="true"
              className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
            >
              {unreadSstv > 9 ? '9+' : unreadSstv}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
