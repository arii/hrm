'use client'
import AnalyticsPage from './components/AnalyticsPage'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from '@/lib/theme'

export default function AnalyticsRootPage() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserSettingsProvider>
        <WebSocketProvider>
          <AnalyticsPage />
        </WebSocketProvider>
      </UserSettingsProvider>
    </ThemeProvider>
  )
}
