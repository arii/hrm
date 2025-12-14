'use client'

import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorDisplay from '@/components/ErrorDisplay'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import Providers from '@/components/Providers'
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { ErrorProvider } from '@/context/ErrorContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

export default function Main({ children }: { children: React.ReactNode }) {
  return (
    <ThemeRegistry options={{ key: 'mui' }}>
      <ErrorProvider>
        <Providers>
          <UserSettingsProvider>
            <ErrorBoundary fallback={<ErrorFallback />}>
              <TimerSoundProvider>{children}</TimerSoundProvider>
            </ErrorBoundary>
          </UserSettingsProvider>
        </Providers>
        <ErrorDisplay />
      </ErrorProvider>
      <Footer />
      <BottomNavBar />
    </ThemeRegistry>
  )
}
