// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorFallback from '../components/ErrorFallback'
import GoogleDocViewer from '../components/GoogleDocViewer'
import HrmTiles from '../components/HrmTiles'
import SpotifyDisplay from '../components/SpotifyDisplay'
import TimerDisplay from '../components/TimerDisplay'
import { useWebSocket } from '@/context/WebSocketContext'

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const Dashboard = () => {
  const { timerData } = useWebSocket()
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)

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
        pb: { xs: 12, sm: 14 }, // Extra bottom padding for fixed Spotify bar
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* This main Grid container will manage the overall page layout */}

        {/* Section 1: Timer. Spans full width on mobile, part on larger screens */}
        <Grid item xs={12} lg={7}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
          />
        </Grid>

        {/* Section 2: HR Tiles. This is a container for the HR tiles. */}
        {/* It will stack below the timer on mobile and be a sidebar on large screens */}
        <Grid
          item
          container
          xs={12}
          lg={5}
          spacing={2}
          alignContent="flex-start" // Important for nested items
        >
          <ErrorBoundary fallback={<ErrorFallback />}>
            <HrmTiles />
          </ErrorBoundary>
        </Grid>

        {/* Section 3: Google Doc Viewer. Always full width below the above content. */}
        <Grid item xs={12}>
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={350} // Reduced height as per plan
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
