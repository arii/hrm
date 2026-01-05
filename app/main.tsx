'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import BottomNavBar from '../src/components/BottomNavBar'
import ErrorBoundary from '../src/components/ErrorBoundary'
import ErrorDisplay from '../src/components/ErrorDisplay'
import ErrorFallback from '../src/components/ErrorFallback'
import Footer from '../src/components/Footer'
import LoadingIndicator from '../src/components/LoadingIndicator'
import Providers from '../src/components/Providers'
import TimerSoundProvider from '../src/components/TimerSoundProvider'
import { pageVariants } from '../src/components/animation/variants'
import { ErrorProvider } from '../src/context/ErrorContext'
import { LoadingProvider } from '../src/context/LoadingContext'
import { UserSettingsProvider } from '../src/context/UserSettingsContext'

export default function Main({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ErrorProvider>
        <LoadingProvider>
          <Providers>
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
          </Providers>
          <LoadingIndicator />
          <ErrorDisplay />
        </LoadingProvider>
      </ErrorProvider>
      <Footer />
      <BottomNavBar />
    </ErrorBoundary>
  )
}
