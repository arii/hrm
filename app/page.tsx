// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import { Container, Grid } from '@mui/material'
import { useEffect, useState } from 'react'
import GoogleDocViewer from '../components/GoogleDocViewer'
import HrTile from '../components/HrTile'
import HrmTiles from '../components/HrmTiles'
import SpotifyDisplay from '../components/SpotifyDisplay'
import TimerDisplay from '../components/TimerDisplay'
import { useBluetoothHRMContext } from '../contexts/BluetoothHRMContext'
import { useAudio } from '../hooks/useAudio'
import useVolumePreference from '../hooks/useVolumePreference'
import useWebSocket from '../hooks/useWebSocket'
import { getHrZoneProps } from '../utils/visualization'

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const Dashboard = () => {
  const { timerData, hrmData } = useWebSocket()
  const { volume } = useVolumePreference(70)
  const { initializeAudio } = useAudio(timerData, volume)
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const { isConnected: isHrmConnected } = useBluetoothHRMContext()

  // Find the HRM data for the connected user
  const connectedHrm = hrmData.find((d) => d.name?.includes('Bluetooth HRM'))
  const hrmTile = connectedHrm
    ? {
        ...connectedHrm,
        ...getHrZoneProps(connectedHrm.value, connectedHrm.maxHr),
      }
    : null

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

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 2000) // Wait for components to mount and stabilize

    return () => clearTimeout(timer)
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
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
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

        {isHrmConnected && hrmTile && (
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <HrTile
              name={hrmTile.name}
              bpm={hrmTile.value}
              percentMax={hrmTile.percentage}
              background={hrmTile.progressColor}
            />
          </Grid>
        )}

        <HrmTiles />

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

      <SpotifyDisplay />
    </Container>
  )
}

export default Dashboard
