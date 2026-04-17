import { formatLatLng, gridToLatLng } from '@/lib/utils/grid'
import { cn } from '@/lib/utils'

interface Props {
  grid: string
  className?: string
}

/**
 * 把 Maidenhead 网格直接渲染成经纬度文本（不是可点击的链接）。
 * 解析失败时回退到网格原文；成功时把原网格放到 title 属性以备参考。
 */
export function GridLocation({ grid, className }: Props) {
  if (!grid) return null
  const ll = gridToLatLng(grid)
  if (!ll) {
    return <span className={cn('hud-mono', className)}>{grid}</span>
  }
  return (
    <span className={cn('hud-mono', className)} title={grid}>
      {formatLatLng(ll)}
    </span>
  )
}
