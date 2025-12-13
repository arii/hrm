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
import HrmConnectionPanel from '../components/HrmConnectionPanel'
import TimerDisplay from '../components/TimerDisplay'
import { useAudio } from '../hooks/useAudio'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'

// Dynamically import SpotifyDisplay with SSR disabled.
// This prevents the heavy Spotify SDK logic from blocking the initial server HTML or hydration.
const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={80} />, // Optional: Render nothing while loading to avoid layout shift
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const WorkoutTableViewer = dynamic(
  () => import('../components/WorkoutTableViewer'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={500} />,
  }
)

const GoogleDocViewer = dynamic(() => import('../components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={500} />,
})

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

const Dashboard = () => {
  const { timerData } = useWebSocket()
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  useVolumePreference()
  const { initializeAudio } = useAudio(timerData)

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

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
      onClick={handleInteraction}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
            soundEventId={timerData.soundEventId}
          />
        </Grid>

        <ErrorBoundary fallback={<ErrorFallback />}>
          <HrmConnectionPanel />
        </ErrorBoundary>

        <Grid item xs={12}>
          {process.env.NEXT_PUBLIC_USE_NATIVE_TABLE ? (
            <WorkoutTableViewer docId={DOC_ID} />
          ) : (
            <GoogleDocViewer
              title="Today's Training Regimen"
              embedUrl={DOC_URL}
              height={500}
              isShrunk={docIsManuallyShrunk}
              onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
            />
          )}
        </Grid>
      </Grid>

      <ErrorBoundary fallback={<ErrorFallback />}>
        <SpotifyDisplay />
      </ErrorBoundary>
    </Container>
  )
}

export default Dashboard
