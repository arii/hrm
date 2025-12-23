'use client'

import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorDisplay from '@/components/ErrorDisplay'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import Providers from '@/components/Providers'
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { CssBaseline, Paper } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export default function Main({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  return (
    <ThemeRegistry options={{ key: 'mui' }}>
      <CssBaseline />
      <Paper
        elevation={0}
        square
        sx={{ backgroundColor: theme.palette.background.default }}
      >
        <ErrorProvider>
          <LoadingProvider>
            <Providers>
              <UserSettingsProvider>
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <TimerSoundProvider>{children}</TimerSoundProvider>
                </ErrorBoundary>
              </UserSettingsProvider>
            </Providers>
            <LoadingIndicator />
            <ErrorDisplay />
          </LoadingProvider>
        </ErrorProvider>
        <Footer />
        <BottomNavBar />
      </Paper>
    </ThemeRegistry>
  )
}
