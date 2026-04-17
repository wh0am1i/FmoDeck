import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLatLng, gridToLatLng, mapUrl } from '@/lib/utils/grid'
import { cn } from '@/lib/utils'

interface Props {
  grid: string
  /** `inline` = 同行显示；`block` = 单独一行（常用于 detail 列表的 dd）。 */
  variant?: 'inline' | 'block'
  className?: string
}

/**
 * 显示 Maidenhead 网格 + 解析出来的经纬度 + 打开地图的外链。
 * 解析失败时只显示网格原文。
 */
export function GridLocation({ grid, variant = 'inline', className }: Props) {
  const { t } = useTranslation()
  const ll = gridToLatLng(grid)

  if (!ll) {
    return <span className={cn('hud-mono', className)}>{grid || '—'}</span>
  }

  const coord = formatLatLng(ll)
  const href = mapUrl(ll)

  if (variant === 'block') {
    return (
      <span className={cn('hud-mono flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
        <span>{grid}</span>
        <span className="text-xs text-muted-foreground">· {coord}</span>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label={t('grid.openMap')}
          title={t('grid.openMap')}
        >
          <MapPin className="h-3 w-3" />
          {t('grid.map')}
        </a>
      </span>
    )
  }

  // inline：紧凑，网格本身做成可点击的链接，hover 看经纬度
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'hud-mono inline-flex items-center gap-0.5 text-primary hover:underline',
        className
      )}
      title={`${coord} — ${t('grid.openMap')}`}
    >
      {grid}
      <MapPin className="h-3 w-3 opacity-70" />
    </a>
  )
}
