// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import Container from '@mui/material/Container'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { useState } from 'react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import TimerDisplay from '@/components/TimerDisplay'
import { useAudio } from '@/hooks/useAudio'
import { useTestPageReady } from '@/hooks/useTestPageReady'

// Dynamically import SpotifyDisplay with SSR disabled.
// This prevents the heavy Spotify SDK logic from blocking the initial server HTML or hydration.
const SpotifyDisplay = dynamic(() => import('@/components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height="80px" />, // Optional: Render nothing while loading to avoid layout shift
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const WorkoutTableViewer = dynamic(
  () => import('@/components/WorkoutTableViewer'),
  {
    ssr: false,
    loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
  }
)

const GoogleDocViewer = dynamic(() => import('@/components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
})

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

const mainGridStyles: SxProps = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    lg: '1fr 1fr',
  },
  gap: 2,
}

const Dashboard = () => {
  // Force error for VRT testing if requested.
  // This is a testing-only utility to verify ErrorFallback UI states via VRT
  // and is triggered by the ?test-error=true query parameter.
  if (
    typeof window !== 'undefined' &&
    window.location.search.includes('test-error=true')
  ) {
    throw new Error('VRT Test Error')
  }

  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const isReady = useTestPageReady()
  const [refreshKey, setRefreshKey] = useState(0)
  const { initializeAudio } = useAudio()

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1)
  }

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

<<<<<<< HEAD
  // Signal when page is ready for testing
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true)
    }
  }, [])

  return (
    <Container
      data-testid="dashboard"
      data-ready={isReady ? 'true' : undefined}
=======
  return (
    <Container
      data-testid="dashboard"
      data-ready={isReady ? 'true' : 'false'}
>>>>>>> origin/leader
      maxWidth="xl"
      onClick={handleInteraction}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={mainGridStyles}>
        {/*
         * The extra Box with height: '100%' is necessary to ensure the TimerDisplay
         * component stretches to fill the full height of the grid cell. The grid
         * itself defines the cell's height, but the child needs to explicitly
         * be told to occupy that full height.
         */}
        <Box sx={{ height: '100%' }}>
          <TimerDisplay />
        </Box>
        {/*
         * HrmConnectionPanel does not need a height wrapper because
         * it's internally structured to fill the height of its container.
         */}
        <HrmConnectionPanel />
      </Box>
      <Box sx={{ width: '100%', mt: 2 }}>
        {process.env.NEXT_PUBLIC_USE_NATIVE_TABLE === 'true' ? (
          <WorkoutTableViewer
            docId={DOC_ID}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        ) : (
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        )}
      </Box>

      <SpotifyDisplay />
    </Container>
  )
}

export default Dashboard
