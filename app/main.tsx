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

export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ErrorProvider>
        <LoadingProvider>
          <UserSettingsProvider>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <TimerSoundProvider>{children}</TimerSoundProvider>
            </ErrorBoundary>
          </UserSettingsProvider>
          <LoadingIndicator />
          <ErrorDisplay />
        </LoadingProvider>
      </ErrorProvider>
      <Footer />
      <BottomNavBar />
    </Providers>
  )
}
