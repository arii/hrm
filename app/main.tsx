'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import BottomNavBar from '@/components/BottomNavBar'
import DashboardMenu from '@/components/DashboardMenu'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import Footer from '@/components/Footer'
import LoadingIndicator from '@/components/LoadingIndicator'
import NotificationProvider from '@/components/NotificationProvider'
import Providers from '@/components/Providers'
import ScaledStage from '@/components/ScaledStage'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { FOOTER_HEIGHT_PX, SPOTIFY_BAR_BOTTOM_OFFSET } from '@/constants/layout'

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

/** Keep the player mounted for audio and remote control, independently
 * of the route's visible navigation. */
export function FooterStack({
  pageMotion,
  isDashboard,
}: {
  pageMotion: React.ReactNode
  isDashboard: boolean
}) {
  const [showPlayerRetry, setShowPlayerRetry] = useState(false)
  return (
    <>
      {pageMotion}
      <Box data-testid="global-spotify-footer-wrapper" sx={{ display: 'none' }}>
        <SpotifyDisplay onRetryAvailable={setShowPlayerRetry} />
      </Box>
      {isDashboard ? (
        <DashboardMenu showPlayerRetry={showPlayerRetry} />
      ) : (
        <>
          <Footer />
          <BottomNavBar />
        </>
      )}
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
        // Short pages keep the footer above the nav (whose height the
        // Spotify bar offset tracks) instead of floating mid-screen; the
        // dashboard canvas sizes itself.
        style={
          isDashboard
            ? undefined
            : {
                minHeight: `calc(100dvh - ${FOOTER_HEIGHT_PX}px - ${SPOTIFY_BAR_BOTTOM_OFFSET})`,
              }
        }
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
