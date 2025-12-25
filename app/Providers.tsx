'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import BottomNavBar from '../components/BottomNavBar'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorDisplay from '../components/ErrorDisplay'
import ErrorFallback from '../components/ErrorFallback'
import Footer from '../components/Footer'
import LoadingIndicator from '../components/LoadingIndicator'
import ThemeRegistry from './components/ThemeRegistry/ThemeRegistry'
import TimerSoundProvider from '../components/TimerSoundProvider'
import { pageVariants } from '../components/animation/variants'
import { ErrorProvider } from '../context/ErrorContext'
import { LoadingProvider } from '../context/LoadingContext'
import { UserSettingsProvider } from '../context/UserSettingsContext'
import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <ThemeRegistry>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ErrorProvider>
          <LoadingProvider>
            <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
              <AudioProvider>
                <WebSocketProvider>
                  <UserSettingsProvider>
                    <TimerSoundProvider>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={pathname}
                          variants={pageVariants}
                          initial="initial"
                          animate="in"
                          exit="out"
                        >
                          {children}
                        </motion.div>
                      </AnimatePresence>
                    </TimerSoundProvider>
                  </UserSettingsProvider>
                </WebSocketProvider>
              </AudioProvider>
            </SessionProvider>
            <LoadingIndicator />
            <ErrorDisplay />
          </LoadingProvider>
        </ErrorProvider>
        <Footer />
        <BottomNavBar />
      </ErrorBoundary>
    </ThemeRegistry>
  )
}
