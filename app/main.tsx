'use client'

import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorDisplay from '@/components/ErrorDisplay'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import Providers from '@/components/Providers'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import Box from '@mui/material/Box'

export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <ErrorProvider>
      <LoadingProvider>
        <Providers>
          <UserSettingsProvider>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                bgcolor: 'background.default',
              }}
            >
              <Box sx={{ flex: '1 0 auto' }}>
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <TimerSoundProvider>{children}</TimerSoundProvider>
                </ErrorBoundary>
              </Box>
              <Footer />
            </Box>
            <BottomNavBar />
          </UserSettingsProvider>
        </Providers>
        <LoadingIndicator />
        <ErrorDisplay />
      </LoadingProvider>
    </ErrorProvider>
  )
}
