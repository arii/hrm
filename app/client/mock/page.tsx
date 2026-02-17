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
import BottomNavBar from '../../../components/BottomNavBar'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  HrmInputMessage,
  HrmMetadataUpdateMessage,
} from '../../../types/websocket'
import {
  calculateMaxHr,
  calculateHrZoneInfo,
  ZONE_THRESHOLDS,
} from '@/lib/shared/hr-zones'
import { HrZoneMethod } from '@/context/UserSettingsContext'
import SettingsForm from '@/components/SettingsForm'
import { useHeightInput } from '@/hooks/useHeightInput'

export default function MockPage() {
  const { sendData, connectionStatus } = useWebSocket()
  const [hrValue, setHrValue] = useState(100)

  // Settings Form State
  const [name, setName] = useState('Mock User')
  const [age, setAge] = useState<string>('30')
  const [gender, setGender] = useState('female')

  // Height using hook (fixed to Metric for Mock)
  const { displayHeight, updateHeight, commitHeight } = useHeightInput(
    '175',
    'METRIC'
  )

  // Weight
  const [weight, setWeight] = useState<string>('70')

  // HR Zones
  const [hrZoneMethod, setHrZoneMethod] = useState<HrZoneMethod>('MAX_HR')
  const [restingHr, setRestingHr] = useState<string>('60')
  const [maxHrOverride, setMaxHrOverride] = useState<string>('')
  const [customZoneThresholds, setCustomZoneThresholds] =
    useState<Record<string, number>>(ZONE_THRESHOLDS)

  const [intervalId, setIntervalId] = useState<number | null>(null)
  const isStreaming = intervalId !== null

  // Derived values for logic
  const ageNum = parseInt(age, 10) || 30
  const maxHrOverrideNum = maxHrOverride ? parseInt(maxHrOverride, 10) : null
  const maxHr = maxHrOverrideNum || calculateMaxHr(ageNum)

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [])

  const sendHrPacket = useCallback(
    (hr: number) => {
      const restingHrNum = parseInt(restingHr, 10) || 60

      const { percentage, zone } = calculateHrZoneInfo(hr, {
        method: hrZoneMethod,
        age: ageNum,
        maxHrOverride: maxHrOverrideNum,
        restingHr: restingHrNum,
        thresholds: customZoneThresholds,
      })

      const message: HrmInputMessage = {
        type: 'HRM_INPUT',
        data: {
          value: hr,
          percentage,
          zone,
        },
      }
      sendData(message)
    },
    [
      sendData,
      ageNum,
      maxHrOverrideNum,
      hrZoneMethod,
      restingHr,
      customZoneThresholds,
    ]
  )

  const sendMetadataPacket = useCallback(() => {
    const heightCm = parseFloat(displayHeight.cm) || 175
    const weightNum = parseFloat(weight) || 70

    const message: HrmMetadataUpdateMessage = {
      type: 'HRM_METADATA_UPDATE',
      data: {
        maxHr: maxHr,
        name: name,
        age: ageNum,
        weight: weightNum,
        height: heightCm,
        gender: gender,
      },
    }
    sendData(message)
  }, [sendData, name, ageNum, maxHr, weight, displayHeight, gender])

  // NOTE: In a real client, metadata would likely be sent once upon connection
  // or when the user explicitly saves settings. For this mock, we send it
  // on every change to the local state for simplicity and immediate feedback.
  useEffect(() => {
    sendMetadataPacket()
  }, [sendMetadataPacket])

  const startStreaming = () => {
    if (isStreaming || connectionStatus !== 'Connected') return
    sendHrPacket(hrValue)
    const id = window.setInterval(() => {
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
      window.clearInterval(intervalId)
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

  const handleThresholdChange = (zone: string, value: number) => {
    setCustomZoneThresholds((prev) => ({ ...prev, [zone]: value }))
  }

  const setHrByZone = (
    zone: 'grey' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  ) => {
    const zones = {
      grey: 95,
      blue: 115,
      green: 135,
      yellow: 155,
      red: 175,
      purple: 195, // Representative HR for Zone 6
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

          <Box data-testid="mock-client-form">
            <SettingsForm
              userName={name}
              setUserName={setName}
              userAge={age}
            setUserAge={setAge}
            unitSystem="METRIC"
            hideUnitToggle={true}
            userHeight={displayHeight}
            setUserHeight={updateHeight}
            onHeightBlur={commitHeight}
            userWeight={weight}
            setUserWeight={setWeight}
            gender={gender}
            setGender={setGender}
            hrZoneMethod={hrZoneMethod}
            setHrZoneMethod={setHrZoneMethod}
            maxHrOverride={maxHrOverride}
            setMaxHrOverride={setMaxHrOverride}
            restingHr={restingHr}
            setRestingHr={setRestingHr}
            customZoneThresholds={customZoneThresholds}
              handleThresholdChange={handleThresholdChange}
            />
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
          <Grid container spacing={1} sx={{ mb: 3 }}>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#9E9E9E' }}
                onClick={() => setHrByZone('grey')}
                data-testid="zone-1-button"
              >
                Zone 1
              </Button>
            </Grid>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#2196F3' }}
                onClick={() => setHrByZone('blue')}
                data-testid="zone-2-button"
              >
                Zone 2
              </Button>
            </Grid>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#4CAF50' }}
                onClick={() => setHrByZone('green')}
                data-testid="zone-3-button"
              >
                Zone 3
              </Button>
            </Grid>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#FFEB3B' }}
                onClick={() => setHrByZone('yellow')}
                data-testid="zone-4-button"
              >
                Zone 4
              </Button>
            </Grid>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#F44336' }}
                onClick={() => setHrByZone('red')}
                data-testid="zone-5-button"
              >
                Zone 5
              </Button>
            </Grid>
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#9C27B0' }}
                onClick={() => setHrByZone('purple')}
                data-testid="zone-6-button"
              >
                Zone 6
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
