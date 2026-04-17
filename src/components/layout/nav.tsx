import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
}

const items: readonly NavItem[] = [
  { to: '/logs', label: 'LOGS' },
  { to: '/top20', label: 'TOP 20' },
  { to: '/old-friends', label: 'OLD FRIENDS' },
  { to: '/messages', label: 'MSG' },
  { to: '/settings', label: 'SETTINGS' }
]

export function Nav() {
  return (
    <nav aria-label="主导航" className="hud-frame flex gap-0 bg-card/50">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'hud-mono hud-title px-4 py-2 text-sm transition-colors',
              'border-r border-border last:border-r-0',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
