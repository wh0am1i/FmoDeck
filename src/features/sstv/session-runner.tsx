// src/features/sstv/session-runner.tsx
import { useLocation } from 'react-router'
import { useSstvDecoder } from './hooks/useSstvDecoder'

/**
 * 仅在用户停留在 /sstv 路由时挂 decoder。离开 tab 即卸载,不做后台监听。
 */
export function SstvSessionRunner() {
  const location = useLocation()
  if (location.pathname !== '/sstv') return null
  return <SstvSessionInner />
}

function SstvSessionInner() {
  useSstvDecoder()
  return null
}
