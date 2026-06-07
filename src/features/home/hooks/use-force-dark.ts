import { useEffect } from 'react'

/**
 * 首页值守屏强制深色主题：HUD 设计（夜图瓦片/辉光/半透明浮层）以深色为本体，
 * 浅色下气质流失严重。进入首页时给 <html> 挂 dark，离开时还原用户原主题。
 * 仅当用户当前是浅色时才介入；本来就是深色则什么都不做。
 */
export function useForceDark(): void {
  useEffect(() => {
    const root = document.documentElement
    if (!root.classList.contains('light')) return
    root.classList.remove('light')
    root.classList.add('dark')
    return () => {
      root.classList.remove('dark')
      root.classList.add('light')
    }
  }, [])
}
