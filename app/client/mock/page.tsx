'use client'

import PeopleIcon from '@mui/icons-material/People'
import Science from '@mui/icons-material/Science'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import { useWebSocket } from '@/context/WebSocketContext'

export default function MockPage() {
  const { connectionStatus } = useWebSocket()
  const [userCount, setUserCount] = useState(4)
  const [isStreaming, setIsStreaming] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  // Initialize the worker
  useEffect(() => {
    workerRef.current = new Worker('/workers/mockMultiUserWorker.js')

    // Cleanup worker on component unmount
    return () => {
      workerRef.current?.postMessage({ command: 'stop' })
      workerRef.current?.terminate()
    }
  }, [])

  // Signal when page is ready for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
    }
  }, [])


  const startStreaming = () => {
    if (connectionStatus !== 'Connected') return
    workerRef.current?.postMessage({ command: 'start', count: userCount })
    setIsStreaming(true)
  }

  const stopStreaming = () => {
    workerRef.current?.postMessage({ command: 'stop' })
    setIsStreaming(false)
  }

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Science color="primary" sx={{ fontSize: 60, mb: 2 }} />
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            Multi-User HRM Streamer
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Simulate multiple users streaming heart rate data.
          </Typography>

          <TextField
            label="Number of Mock Users"
            type="number"
            value={userCount}
            onChange={(e) => setUserCount(parseInt(e.target.value, 10))}
            variant="outlined"
            fullWidth
            size="medium"
            disabled={isStreaming}
            inputProps={{ 'data-testid': 'user-count-input', min: 1, max: 20 }}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            color={isStreaming ? 'error' : 'primary'}
            onClick={isStreaming ? stopStreaming : startStreaming}
            disabled={connectionStatus !== 'Connected'}
            startIcon={<PeopleIcon />}
            fullWidth
            sx={{ mb: 3 }}
            data-testid={
              isStreaming ? 'streaming-stop-button' : 'streaming-start-button'
            }
          >
            {isStreaming
              ? `STOP ${userCount} User Stream`
              : `START ${userCount} User Stream`}
          </Button>

          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              backgroundColor:
                connectionStatus === 'Connected'
                  ? 'success.light'
                  : 'error.light',
              color:
                connectionStatus === 'Connected'
                  ? 'success.contrastText'
                  : 'error.contrastText',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Server Status: {connectionStatus}
            </Typography>
          </Box>
        </Card>
      </Container>
      <BottomNavBar />
    </>
  )
}
