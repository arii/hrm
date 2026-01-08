'use client'

import { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import Fade from '@mui/material/Fade'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

// Hooks
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

// Components
import { HeartRateGradientChart } from './charts/HeartRateGradientChart'
import HrmTiles from './HrmTiles'
import HeartRateZones from './HeartRateZones'
import HRMonitorStatusIndicator from './HRMonitorStatusIndicator'
import ConnectHRMonitorButton from './ConnectHRMonitorButton'
import DashboardSectionLoadingSkeleton from './DashboardSectionLoadingSkeleton'

// Constants
const HISTORY_WINDOW_SIZE = 60 // Keep last 60 data points (approx 1 minute)

export default function PersonalAnalyticsDashboard() {
  // 1. Core Data Sources
  const {
    heartRate, // Ensure you exposed this in the hook!
    deviceStatus,
    batteryLevel,
    connectAndStream,
    disconnect,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  const { connectionStatus: wsStatus } = useWebSocket()

  // 2. Local State for Visualization
  const [history, setHistory] = useState<{ timestamp: number; bpm: number }[]>(
    []
  )
  const lastUpdateRef = useRef<number>(0)

  // 3. Data Buffering Logic (Throttled to 1Hz for UI performance)
  useEffect(() => {
    const updateHistory = () => {
      if (!heartRate || heartRate <= 0) return

      const now = Date.now()
      // Limit UI updates to approx 1000ms to save resources,
      // even if device sends data faster (e.g. 4Hz)
      if (now - lastUpdateRef.current < 1000) return

      setHistory((prev) => {
        const newData = [...prev, { timestamp: now, bpm: heartRate }]
        // Maintain sliding window
        if (newData.length > HISTORY_WINDOW_SIZE) {
          return newData.slice(newData.length - HISTORY_WINDOW_SIZE)
        }
        return newData
      })

      lastUpdateRef.current = now
    }

    updateHistory()
  }, [heartRate])

  // Clear history on disconnect
  useEffect(() => {
    const clearHistory = () => {
      if (!isConnected) {
        setHistory([])
      }
    }

    clearHistory()
  }, [isConnected])

  // 4. Loading State
  // We consider the dashboard "loading" only if we are actively connecting
  const isConnecting = deviceStatus.toLowerCase().includes('connecting')

  if (isConnecting) {
    return <DashboardSectionLoadingSkeleton />
  }

  return (
    <Box sx={{ width: '100%', p: 2, maxWidth: 1600, margin: '0 auto' }}>
      {/* HEADER: Status & Controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <HRMonitorStatusIndicator
          deviceStatus={deviceStatus}
          batteryLevel={batteryLevel}
        />
        {/* If not connected, show the full connection panel, otherwise just a disconnect button could go here */}
      </Box>

      {!isConnected && (
        <Box sx={{ mb: 4 }}>
          <ConnectHRMonitorButton
            connect={connectAndStream}
            disconnect={disconnect}
            isConnected={isConnected}
            isSupported={isSupported}
          />
          {wsStatus !== 'Connected' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Server connection lost. Real-time features may be unavailable.
            </Alert>
          )}
        </Box>
      )}

      {isConnected && (
        <Fade in={isConnected}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* TOP ROW: Key Metrics (Tiles) */}
            <HrmTiles
              heartRate={heartRate || 0}
              calories={0} // Connect to useCalorieCounter if available
              duration={0} // Connect to Timer if available
            />

            {/* MIDDLE ROW: Main Visualization (Chart + Zones) */}
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Paper
                sx={{
                  p: 3,
                  height: '450px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 2,
                }}
              >
                <HeartRateGradientChart data={history} height={400} />
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  height: '450px',
                  overflowY: 'auto',
                  flex: 1,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Current Zone
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {/* Reuse existing Zone component, passing live HR */}
                <HeartRateZones currentHr={heartRate || 0} />
              </Paper>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  )
}
