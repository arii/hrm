'use client'
import ExperimentalAnalyticsPage from './components/ExperimentalAnalyticsPage'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { CssBaseline, ThemeProvider } from '@mui/material'
import theme from '@/theme/theme'

export default function ExperimentalPage() {
  return <ExperimentalAnalyticsPage />
}
