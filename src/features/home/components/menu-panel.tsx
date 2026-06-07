import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { DASHBOARD_PATH, NAV_ITEMS } from '@/components/layout/nav-items'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

/** 右上角 ☰ 菜单浮层：首页隐藏导航条后的页面切换入口。 */
export function MenuPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const items = NAV_ITEMS.filter((i) => i.to !== DASHBOARD_PATH)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('home.menuAria')}
        className="hud-frame hud-overlay flex items-center justify-center px-3 text-primary hover:bg-primary/10"
      >
        <Menu className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="hud-mono">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} onSelect={() => void navigate(item.to)}>
            {item.labelKey ? t(item.labelKey) : item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
