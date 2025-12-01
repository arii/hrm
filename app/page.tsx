// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import SettingsIcon from '@mui/icons-material/Settings'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import SettingsPanel from '@/components/SettingsPanel'
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
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1200 }}>
        <IconButton
          onClick={() => setSettingsOpen(true)}
          color="primary"
          aria-label="Settings"
        >
          <SettingsIcon />
        </IconButton>
      </Box>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid item xs={12} lg={6}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
          />
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
