import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLatLng, gridToLatLng } from '@/lib/utils/grid'
import {
  readGeocodeCache,
  reverseGeocodeGrid
} from '@/lib/utils/reverse-geocode'
import { cn } from '@/lib/utils'

interface Props {
  grid: string
  className?: string
}

/**
 * 把 Maidenhead 网格渲染成人类可读地名（通过 OpenStreetMap Nominatim
 * 反查）。查询未完成时先显示经纬度占位；查询完成后替换为地名。
 *
 * 缓存在 localStorage 里，同网格只会查一次；限速 1 req/秒（全局队列）。
 */
export function GridLocation({ grid, className }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'zh-CN' = i18n.language.startsWith('en') ? 'en' : 'zh-CN'

  // 首次渲染优先读缓存；undefined = 未查过（待触发），null = 查过无结果
  const [name, setName] = useState<string | null | undefined>(() => readGeocodeCache(grid))

  useEffect(() => {
    if (!grid) return
    // 重新拉时基于最新缓存
    const cached = readGeocodeCache(grid)
    if (cached !== undefined) {
      setName(cached)
      return
    }
    let cancelled = false
    void reverseGeocodeGrid(grid, lang).then((result) => {
      if (!cancelled) setName(result)
    })
    return () => {
      cancelled = true
    }
  }, [grid, lang])

  if (!grid) return null

  const ll = gridToLatLng(grid)
  // title 始终包含原网格码 + 经纬度，hover 看细节
  const tooltipParts: string[] = [grid]
  if (ll) tooltipParts.push(formatLatLng(ll))
  const title = tooltipParts.join(' · ')

  // 查到地名 → 显示地名
  if (name) {
    return (
      <span className={cn('hud-mono', className)} title={title}>
        {name}
      </span>
    )
  }

  // 查过但无结果 → 回退经纬度
  if (name === null && ll) {
    return (
      <span className={cn('hud-mono', className)} title={title}>
        {formatLatLng(ll)}
      </span>
    )
  }

  // 查询中（或未触发）→ 先显示经纬度作为占位
  if (ll) {
    return (
      <span className={cn('hud-mono opacity-75', className)} title={title}>
        {formatLatLng(ll)}
      </span>
    )
  }

  // 网格无法解析 → 原样显示
  return <span className={cn('hud-mono', className)}>{grid}</span>
}
