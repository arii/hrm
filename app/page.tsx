// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import { Container, Grid } from '@mui/material'
import { useEffect, useState } from 'react'
import GoogleDocViewer from '../components/GoogleDocViewer'
import HrmTiles from '../components/HrmTiles'
import HrTile from '../components/HrTile'
import SpotifyDisplay from '../components/SpotifyDisplay'
import TimerDisplay from '../components/TimerDisplay'
import { useBluetoothHRMContext } from '../contexts/BluetoothHRMContext'
import useWebSocket from '../hooks/useWebSocket'
import { getHrZoneProps } from '../utils/visualization'

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const Dashboard = () => {
  const { timerData, hrmData } = useWebSocket()
  const { isConnected: isHrmConnected } = useBluetoothHRMContext()
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)

  // Signal when page is ready for testing
  // Signal when page is ready for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
    }
  }, [])

  // Derive a focused tile for a directly connected Bluetooth HRM (if present)
  const connectedHrm = hrmData.find((d) => d.name?.includes('Bluetooth HRM'))
  const hrmTile = connectedHrm
    ? {
        ...connectedHrm,
        ...getHrZoneProps(connectedHrm.value, connectedHrm.maxHr ?? 190),
      }
    : null

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
              name={hrmTile.name ?? 'Bluetooth HRM'}
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
