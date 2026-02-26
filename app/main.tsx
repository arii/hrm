'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import CombinedFooter from '@/components/CombinedFooter'
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
                    <Box
                      component={motion.main}
                      key={pathname}
                      variants={pageVariants}
                      initial="initial"
                      animate="in"
                      exit="out"
                      data-testid="main-content-layout"
                      role="main"
                      sx={{
                        pb: 'var(--footer-height, 56px)',
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>{children}</Box>
                      <Footer />
                    </Box>
                  </AnimatePresence>
                  <CombinedFooter />
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
