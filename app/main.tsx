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
import { SnackbarProvider } from '@/context/SnackbarContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry options={{ key: 'mui' }}>
      <ErrorProvider>
        <LoadingProvider>
          <SnackbarProvider>
            <Providers>
              <UserSettingsProvider>
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <TimerSoundProvider>{children}</TimerSoundProvider>
                </ErrorBoundary>
              </UserSettingsProvider>
            </Providers>
          </SnackbarProvider>
          <LoadingIndicator />
          <ErrorDisplay />
        </LoadingProvider>
      </ErrorProvider>
      <Footer />
      <BottomNavBar />
    </ThemeRegistry>
  )
}
