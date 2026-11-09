'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import BottomNavBar from '@/components/BottomNavBar'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import NotificationProvider from '@/components/NotificationProvider'
import Providers from '@/components/Providers'
import ScaledStage from '@/components/ScaledStage'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { SPOTIFY_BAR_BOTTOM_OFFSET } from '@/constants/layout'

// Dynamically import SpotifyDisplay with SSR disabled.
const SpotifyDisplay = dynamic(() => import('@/components/SpotifyDisplay'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: SPOTIFY_BAR_BOTTOM_OFFSET,
        left: 0,
        right: 0,
        zIndex: 1100,
        width: '100%',
        minHeight: '3rem',
      }}
    >
      <DashboardSectionLoadingSkeleton height="48px" />
    </Box>
  ),
})
import { pageVariants } from '@/components/animation/variants'
import { ErrorProvider } from '@/context/ErrorContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

/** Page content plus the global footer stack, shared by both layout
 * branches so no route can silently lose the Spotify bar. The player
 * stays mounted on every route (audio persistence); the wrapper hides
 * its UI off-dashboard so it never overlaps Controls/Stream content. */
export function FooterStack({
  pageMotion,
  isDashboard,
}: {
  pageMotion: React.ReactNode
  isDashboard: boolean
}) {
  return (
    <>
      {pageMotion}
      <Box
        data-testid="global-spotify-footer-wrapper"
        sx={{ display: isDashboard ? 'block' : 'none' }}
      >
        <SpotifyDisplay />
      </Box>
      <Footer />
      <BottomNavBar />
    </>
  )
}

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
                      <FooterStack
                        pageMotion={pageMotion}
                        isDashboard={isDashboard}
                      />
                    </ScaledStage>
                  ) : (
                    <FooterStack
                      pageMotion={pageMotion}
                      isDashboard={isDashboard}
                    />
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
