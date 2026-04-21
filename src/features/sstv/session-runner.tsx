// src/features/sstv/session-runner.tsx
import { useLocation } from 'react-router'
import { useSstvDecoder } from './hooks/useSstvDecoder'
import { settingsStore } from '@/stores/settings'

/**
 * 根据 backgroundSstv 设置或当前是否在 /sstv 路由决定 decoder 是否运行。
 * 用条件渲染方式 —— 需要运行时渲染子组件,子组件 mount 起 hook。
 */
export function SstvSessionRunner() {
  const location = useLocation()
  const backgroundSstv = settingsStore((s) => s.backgroundSstv)
  const onSstvTab = location.pathname === '/sstv'
  const shouldRun = backgroundSstv || onSstvTab

  if (!shouldRun) return null
  return <SstvSessionInner />
}

function SstvSessionInner() {
  useSstvDecoder()
  return null
}
