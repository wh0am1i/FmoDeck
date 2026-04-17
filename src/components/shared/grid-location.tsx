import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLatLng, gridToLatLng, mapUrl } from '@/lib/utils/grid'
import { readGeocodeCache, reverseGeocodeGrid } from '@/lib/utils/reverse-geocode'
import { cn } from '@/lib/utils'

interface Props {
  grid: string
  className?: string
}

/**
 * 把 Maidenhead 网格渲染成 "网格码 · 地名" 的可点击链接。
 * 点击打开 OpenStreetMap 对应位置。
 *
 * 地名由 Nominatim 反查并缓存到 localStorage；查询未完成时先显示
 * 经纬度作为占位，查到后替换为地名。
 */
export function GridLocation({ grid, className }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'zh-CN' = i18n.language.startsWith('en') ? 'en' : 'zh-CN'

  // undefined = 未查过；null = 查过无结果
  const [name, setName] = useState<string | null | undefined>(() => readGeocodeCache(grid))

  useEffect(() => {
    if (!grid) return
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

  // 网格无法解析 → 原样展示，不做链接
  if (!ll) {
    return <span className={cn('hud-mono', className)}>{grid}</span>
  }

  // 副文本：优先地名；查询中用半透明经纬度；查过无结果用实色经纬度
  let subtext: React.ReactNode
  let subtextTitle = ''
  if (name) {
    subtext = <span className="text-muted-foreground">{name}</span>
    subtextTitle = formatLatLng(ll)
  } else if (name === null) {
    subtext = <span className="text-muted-foreground">{formatLatLng(ll)}</span>
  } else {
    subtext = <span className="text-muted-foreground/60">{formatLatLng(ll)}</span>
  }

  return (
    <a
      href={mapUrl(ll)}
      target="_blank"
      rel="noreferrer noopener"
      // 阻止冒泡，避免父级 tr / button 的 onClick 同时触发（比如日志
      // 表格行点击会打开详情弹窗 —— 不应因为点网格链接也弹出来）
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'hud-mono inline-flex flex-wrap items-baseline gap-x-1.5 text-primary hover:underline',
        className
      )}
      title={subtextTitle || grid}
    >
      <span>{grid}</span>
      <span className="text-muted-foreground/60">·</span>
      {subtext}
    </a>
  )
}
