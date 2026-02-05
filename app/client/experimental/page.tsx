'use client'
import ExperimentalAnalyticsPage from './components/ExperimentalAnalyticsPage'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

export default function ExperimentalPage() {
  return (
    <UserSettingsProvider>
      <WebSocketProvider>
        <ExperimentalAnalyticsPage />
      </WebSocketProvider>
    </UserSettingsProvider>
  )
}
