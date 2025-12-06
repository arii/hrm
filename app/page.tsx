// UI Refactor
// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorFallback from '../components/ErrorFallback'
import HrmTiles from '../components/HrmTiles'
import WorkoutControls from '../components/WorkoutControls'
import DashboardWidget from '../components/widgets/DashboardWidget'
import { useWebSocket } from '@/context/WebSocketContext'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import useVolumePreference from '@/hooks/useVolumePreference'

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

// Lazy-load heavy components
const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={80} />,
})
const GoogleDocViewer = dynamic(() => import('../components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={500} />,
})

const Dashboard = () => {
  const { timerData } = useWebSocket()
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const { volume } = useVolumePreference() // Get volume state

  // Initialize Spotify Web Playback SDK
  const { player } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useSpotifyRemoteExecution(player)

  // Signal when page is ready for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
    }
  }, [])

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}
        <Grid item xs={12} lg={6}>
          <DashboardWidget title="Workout Timer">
            <WorkoutControls />
          </DashboardWidget>
        </Grid>

        <ErrorBoundary fallback={<ErrorFallback />}>
          <HrmTiles />
        </ErrorBoundary>

        <Grid item xs={12}>
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
          />
        </Grid>
      </Grid>

      <ErrorBoundary fallback={<ErrorFallback />}>
        <SpotifyDisplay />
      </ErrorBoundary>
    </Container>
  )
}

export default Dashboard
