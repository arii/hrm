'use client'

import HeartBroken from '@mui/icons-material/HeartBroken'
import Science from '@mui/icons-material/Science'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'

import BottomNavBar from '@/components/BottomNavBar'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmInputMessage } from '@/types/websocket'

export default function MockPage() {
  const { sendData, connectionStatus } = useWebSocket()
  const [hrValue, setHrValue] = useState(100)
  const [name, setName] = useState('Mock User')
  const [age, setAge] = useState(30)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  const isStreaming = intervalId !== null
  const maxHr = 220 - age

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const sendHrPacket = useCallback(
    (hr: number) => {
      const message: HrmInputMessage = {
        type: 'HRM_INPUT',
        data: {
          value: hr,
          maxHr: maxHr,
          name: name,
          age: age,
        },
      }
      sendData(message)
    },
    [sendData, name, age, maxHr]
  )

  const startStreaming = () => {
    if (isStreaming || connectionStatus !== 'Connected') return
    sendHrPacket(hrValue)
    const id = setInterval(() => {
      const fluctuatedHr = Math.max(
        70,
        hrValue + Math.floor(Math.random() * 5) - 2
      )
      setHrValue(fluctuatedHr)
      sendHrPacket(fluctuatedHr)
    }, 2000)
    setIntervalId(id)
  }

  const stopStreaming = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    setHrValue(isNaN(value) ? 0 : value)
    if (!isStreaming) {
      sendHrPacket(value)
    }
  }

  const setHrByZone = (zone: 'grey' | 'blue' | 'green' | 'yellow' | 'red') => {
    const zones = {
      grey: 95,
      blue: 115,
      green: 135,
      yellow: 155,
      red: 175,
    }
    const newHr = zones[zone]
    setHrValue(newHr)
    if (!isStreaming) {
      sendHrPacket(newHr)
    }
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
            HRM Mock Streamer
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Simulate heart rate data for testing.
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={8}>
              <TextField
                label="User Name"
                placeholder="e.g., Mock User"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Age"
                placeholder="e.g., 30"
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
          </Grid>

          <TextField
            label="Current BPM"
            placeholder="e.g., 120"
            type="number"
            value={hrValue}
            onChange={handleValueChange}
            variant="outlined"
            fullWidth
            size="medium"
            disabled={isStreaming}
            inputProps={{ 'data-testid': 'hr-input' }}
            sx={{ mb: 3 }}
          />

          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Select a zone to set HR:
          </Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            <Grid item xs>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#9E9E9E' }}
                onClick={() => setHrByZone('grey')}
              >
                Zone 1
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#2196F3' }}
                onClick={() => setHrByZone('blue')}
              >
                Zone 2
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#4CAF50' }}
                onClick={() => setHrByZone('green')}
              >
                Zone 3
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#FFEB3B', color: 'black' }}
                onClick={() => setHrByZone('yellow')}
              >
                Zone 4
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#F44336' }}
                onClick={() => setHrByZone('red')}
              >
                Zone 5
              </Button>
            </Grid>
          </Grid>

          <Button
            variant="contained"
            size="large"
            color={isStreaming ? 'error' : 'primary'}
            onClick={isStreaming ? stopStreaming : startStreaming}
            disabled={connectionStatus !== 'Connected'}
            startIcon={<HeartBroken />}
            fullWidth
            sx={{ mb: 3 }}
          >
            {isStreaming
              ? `STOP Streaming HR: ${hrValue} BPM`
              : 'START Continuous Stream'}
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
