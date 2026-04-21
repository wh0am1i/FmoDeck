import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { ControlView } from '@/features/control/control-view'
import { LogsView } from '@/features/logs/logs-view'
import { Top20View } from '@/features/top20/top20-view'
import { OldFriendsView } from '@/features/old-friends/old-friends-view'
import { MessagesView } from '@/features/messages/messages-view'
import { SettingsView } from '@/features/settings/settings-view'
import { SpectrumView } from '@/features/spectrum/spectrum-view'
import { SstvView } from '@/features/sstv/sstv-view'

const ENABLE_APRS = import.meta.env.VITE_ENABLE_APRS !== 'false'

const AprsView = ENABLE_APRS
  ? lazy(() => import('@/features/aprs/aprs-view').then((m) => ({ default: m.AprsView })))
  : null

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/logs" replace />} />
      <Route path="/logs" element={<LogsView />} />
      <Route path="/top20" element={<Top20View />} />
      <Route path="/old-friends" element={<OldFriendsView />} />
      <Route path="/messages" element={<MessagesView />} />
      <Route path="/spectrum" element={<SpectrumView />} />
      <Route path="/control" element={<ControlView />} />
      {AprsView && (
        <Route
          path="/aprs"
          element={
            <Suspense fallback={null}>
              <AprsView />
            </Suspense>
          }
        />
      )}
      <Route path="/sstv" element={<SstvView />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="*" element={<Navigate to="/logs" replace />} />
    </Routes>
  )
}
