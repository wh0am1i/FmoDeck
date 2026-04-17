import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  /** i18n key（nav.*）。 */
  labelKey: string
}

const items: readonly NavItem[] = [
  { to: '/logs', labelKey: 'nav.logs' },
  { to: '/top20', labelKey: 'nav.top20' },
  { to: '/old-friends', labelKey: 'nav.oldFriends' },
  { to: '/messages', labelKey: 'nav.messages' },
  { to: '/control', labelKey: 'nav.control' },
  { to: '/aprs', labelKey: 'nav.aprs' },
  { to: '/settings', labelKey: 'nav.settings' }
]

export function Nav() {
  const { t } = useTranslation()
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
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
