'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorDisplay from '@/components/ErrorDisplay'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import Providers from '@/components/Providers'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { pageVariants } from '@/components/animation/variants'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

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
