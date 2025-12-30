'use client'

import HeartBroken from '@mui/icons-material/HeartBroken'
import Science from '@mui/icons-material/Science'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  HrmInputMessage,
  HrmMetadataUpdateMessage,
} from '../../../types/websocket'

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
        },
      }
      sendData(message)
    },
    [sendData]
  )

  const sendMetadataPacket = useCallback(() => {
    const message: HrmMetadataUpdateMessage = {
      type: 'HRM_METADATA_UPDATE',
      data: {
        maxHr: maxHr,
        name: name,
        age: age,
      },
    }
    sendData(message)
  }, [sendData, name, age, maxHr])

  // NOTE: In a real client, metadata would likely be sent once upon connection
  // or when the user explicitly saves settings. For this mock, we send it
  // on every change to the local state for simplicity and immediate feedback.
  useEffect(() => {
    sendMetadataPacket()
  }, [sendMetadataPacket])

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

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '2 1 0' }}>
              <TextField
                label="User Name"
                placeholder="e.g., Mock User"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
            </Box>
            <Box sx={{ flex: '1 1 0' }}>
              <TextField
                label="Age"
                placeholder="e.g., 30"
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Box>
          </Box>

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
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mb: 3,
              justifyContent: 'center',
            }}
          >
            <Box>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#9E9E9E' }}
                onClick={() => setHrByZone('grey')}
                data-testid="zone-1-button"
              >
                Zone 1
              </Button>
            </Box>
            <Box>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#2196F3' }}
                onClick={() => setHrByZone('blue')}
                data-testid="zone-2-button"
              >
                Zone 2
              </Button>
            </Box>
            <Box>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#4CAF50' }}
                onClick={() => setHrByZone('green')}
                data-testid="zone-3-button"
              >
                Zone 3
              </Button>
            </Box>
            <Box>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#FFEB3B', color: 'black' }}
                onClick={() => setHrByZone('yellow')}
                data-testid="zone-4-button"
              >
                Zone 4
              </Button>
            </Box>
            <Box>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#F44336' }}
                onClick={() => setHrByZone('red')}
                data-testid="zone-5-button"
              >
                Zone 5
              </Button>
            </Box>
          </Box>

          <Button
            variant="contained"
            size="large"
            color={isStreaming ? 'error' : 'primary'}
            onClick={isStreaming ? stopStreaming : startStreaming}
            disabled={connectionStatus !== 'Connected'}
            startIcon={<HeartBroken />}
            fullWidth
            sx={{ mb: 3 }}
            data-testid={
              isStreaming ? 'streaming-stop-button' : 'streaming-start-button'
            }
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
