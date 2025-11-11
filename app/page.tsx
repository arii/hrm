// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import { Container, Grid } from '@mui/material'
import { useEffect } from 'react'
import GoogleDocViewer from '@/components/GoogleDocViewer'
import TimerDisplay from '@/components/TimerDisplay'
import { useAudio } from '@/hooks/useAudio'
import useWebSocket from '@/hooks/useWebSocket'
import SpotifyDisplay from '@/components/SpotifyDisplay'
import HrmTiles from '@/components/HrmTiles'

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true' // Ensure embedded view for full-screen content

const Dashboard = () => {
  const { timerData } = useWebSocket()
  const { initializeAudio } = useAudio(timerData, 70) // Assuming a default volume of 70

  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudio()
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [initializeAudio])

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
        <Grid item xs={12} lg={6}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            cycle={timerData.cycle}
            totalCycles={timerData.totalCycles}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
          />
        </Grid>

        <HrmTiles />

        <Grid item xs={12}>
          <SpotifyDisplay />
        </Grid>

        <Grid item xs={12}>
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={500}
            isShrunk={false}
            onToggleShrink={() => {}}
          />
        </Grid>
      </Grid>
    </Container>
  )
}

export default Dashboard
