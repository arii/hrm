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
import ScaledStage from '@/components/ScaledStage'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { pageVariants } from '@/components/animation/variants'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

export default function Main({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Same route check as BottomNavBar's Dashboard tab: under a basePath,
  // usePathname still reports '/' for the dashboard route.
  const isDashboard = pathname === '/'
  const pageMotion = (
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
  )
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <ErrorProvider>
        <LoadingProvider>
          <NotificationProvider>
            <Providers>
              <UserSettingsProvider>
                <TimerSoundProvider>
                  {isDashboard ? (
                    <ScaledStage>
                      {pageMotion}
                      <Footer />
                      <BottomNavBar />
                    </ScaledStage>
                  ) : (
                    <>
                      {pageMotion}
                      <Footer />
                      <BottomNavBar />
                    </>
                  )}
                </TimerSoundProvider>
              </UserSettingsProvider>
            </Providers>
          </NotificationProvider>
          <LoadingIndicator />
        </LoadingProvider>
      </ErrorProvider>
    </ErrorBoundary>
  )
}
