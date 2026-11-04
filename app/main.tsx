'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import NotificationProvider from '@/components/NotificationProvider'
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
          <NotificationProvider>
            <Providers>
              <UserSettingsProvider>
                <TimerSoundProvider>
                  <AnimatePresence mode="wait">
                    <motion.main
                      key={pathname}
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                      data-testid="main-content-layout"
                      role="main"
                    >
                      {children}
                    </motion.main>
                  </AnimatePresence>
                </TimerSoundProvider>
              </UserSettingsProvider>
            </Providers>
          </NotificationProvider>
          <LoadingIndicator />
        </LoadingProvider>
      </ErrorProvider>
      {/* The dashboard is a fixed-viewport surface (100dvh, clipped);
          an in-flow footer would only add dead scroll below the fold,
          invisible behind the fixed bottom nav. Other pages keep it. */}
      {pathname !== '/' && <Footer />}
      <BottomNavBar />
    </ErrorBoundary>
  )
}
