'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { SnackbarProvider } from 'notistack'
import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
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
      <SnackbarProvider>
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
                      data-testid="main-content-layout"
                    >
                      {children}
                    </motion.div>
                  </AnimatePresence>
                </TimerSoundProvider>
              </UserSettingsProvider>
            </Providers>
            <LoadingIndicator />
          </LoadingProvider>
        </ErrorProvider>
      </SnackbarProvider>
      <Footer />
      <BottomNavBar />
    </ErrorBoundary>
  )
}
