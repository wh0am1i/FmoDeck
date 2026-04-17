import { Navigate, Route, Routes } from 'react-router'
import { LogsView } from '@/features/logs/logs-view'
import { Top20View } from '@/features/top20/top20-view'
import { OldFriendsView } from '@/features/old-friends/old-friends-view'
import { MessagesView } from '@/features/messages/messages-view'
import { SettingsView } from '@/features/settings/settings-view'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/logs" replace />} />
      <Route path="/logs" element={<LogsView />} />
      <Route path="/top20" element={<Top20View />} />
      <Route path="/old-friends" element={<OldFriendsView />} />
      <Route path="/messages" element={<MessagesView />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="*" element={<Navigate to="/logs" replace />} />
    </Routes>
  )
}
