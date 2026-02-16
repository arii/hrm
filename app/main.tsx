'use client'

import Box from '@mui/material/Box'
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

/**
 * Main Layout Wrapper: Centralizes providers, navigation, and global layout structure.
 * This component wraps the page children to ensure consistent application state
 * and UI elements across all routes.
 */
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
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '100vh',
                      bgcolor: 'background.default',
                      color: 'text.primary',
                    }}
                  >
                    <Box
                      component="main"
                      role="main"
                      sx={{
                        flexGrow: 1,
                        pb: { xs: 8, sm: 9 }, // Ensure space for fixed BottomNavBar
                        width: '100%',
                        overflowX: 'hidden', // Prevent horizontal scroll during transitions
                      }}
                    >
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
                    </Box>
                    <Footer />
                    <BottomNavBar />
                  </Box>
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
