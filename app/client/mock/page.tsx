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
import { useCallback, useEffect, useRef, useState } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  HrmInputMessage,
  HrmMetadataUpdateMessage,
} from '../../../types/websocket'
import { calculateZoneFromMaxHr, toHeartRateZone } from '@/lib/shared/hr-zones'
import { calculateMaxHr } from '@/utils/hrCalculations'
import { estimateCaloriesBurned } from '@/lib/calorie-estimation'
import { Gender } from '@/types/core'
import MenuItem from '@mui/material/MenuItem'

export default function MockPage() {
  const { sendData, connectionStatus } = useWebSocket()
  const [hrValue, setHrValue] = useState(100)
  const [name, setName] = useState('Mock User')
  const [age, setAge] = useState(30)
  const [weightKg, setWeightKg] = useState(70)
  const [heightCm, setHeightCm] = useState(175)
  const [gender, setGender] = useState<Gender>('FEMALE')
  const [calories, setCalories] = useState(0)
  const [intervalId, setIntervalId] = useState<number | null>(null)

  const isStreaming = intervalId !== null
  const maxHr = calculateMaxHr(age)

  // Maintain refs for values accessed inside the interval to avoid stale closures
  const latestProfile = useRef({ age, weightKg, heightCm, gender, name, maxHr })
  const sendHrPacketRef = useRef<(hr: number, currentCalories: number) => void>(
    () => {}
  )

  const sendHrPacket = useCallback(
    (hr: number, currentCalories: number) => {
      const { zone, percentage } = calculateZoneFromMaxHr(
        hr,
        calculateMaxHr(latestProfile.current.age)
      )
      const heartRateZone = toHeartRateZone(zone)

      const message: HrmInputMessage = {
        type: 'HRM_INPUT',
        data: {
          value: hr,
          percentage,
          zone: heartRateZone,
          calories: currentCalories,
        },
      }
      sendData(message)
    },
    [sendData]
  )

  const sendMetadataPacket = useCallback(() => {
    const { maxHr, name, age, weightKg, heightCm, gender } =
      latestProfile.current
    const message: HrmMetadataUpdateMessage = {
      type: 'HRM_METADATA_UPDATE',
      data: {
        maxHr,
        name,
        age,
        weightKg,
        heightCm,
        gender,
      },
    }
    sendData(message)
  }, [sendData])

  // Sync refs and send metadata on every change
  useEffect(() => {
    latestProfile.current = { age, weightKg, heightCm, gender, name, maxHr }
    sendHrPacketRef.current = sendHrPacket
    sendMetadataPacket()
  }, [
    age,
    weightKg,
    heightCm,
    gender,
    name,
    maxHr,
    sendHrPacket,
    sendMetadataPacket,
  ])

  const startStreaming = () => {
    if (isStreaming || connectionStatus !== 'Connected') return

    // Initial send
    sendHrPacket(hrValue, calories)

    const id = window.setInterval(() => {
      setHrValue((prevHr) => {
        const fluctuatedHr = Math.max(
          70,
          prevHr + Math.floor(Math.random() * 5) - 2
        )

        setCalories((prevCalories) => {
          const { age, weightKg, gender } = latestProfile.current

          const caloriesDelta = estimateCaloriesBurned({
            heartRate: fluctuatedHr,
            age,
            weightKg,
            gender,
            durationMinutes: 2 / 60, // 2 seconds interval
          })
          const newCalories = prevCalories + caloriesDelta

          // Use the ref to ensure we call the latest version of the function
          sendHrPacketRef.current(fluctuatedHr, newCalories)

          return newCalories
        })

        return fluctuatedHr
      })
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
    const finalValue = isNaN(value) ? 0 : value
    setHrValue(finalValue)
    if (!isStreaming) {
      sendHrPacket(finalValue, calories)
    }
  }

  const setHrByZone = (
    zone: 'idle' | 'grey' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  ) => {
    const zones = {
      idle: 65,
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
      sendHrPacket(newHr, calories)
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

          <Grid
            container
            spacing={2}
            sx={{ mb: 3 }}
            data-testid="mock-client-form"
          >
            <Grid size={{ xs: 8 }}>
              <TextField
                label="User Name"
                placeholder="e.g., Mock User"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Age"
                placeholder="e.g., 30"
                type="number"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Weight (kg)"
                placeholder="e.g., 70"
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Height (cm)"
                placeholder="e.g., 175"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                select
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                fullWidth
              >
                <MenuItem value="MALE">Male</MenuItem>
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="NEUTRAL">Neutral</MenuItem>
              </TextField>
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
            <Grid size={{ xs: 'auto' }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: '#616161' }}
                onClick={() => setHrByZone('idle')}
                data-testid="zone-0-button"
              >
                Zone 0
              </Button>
            </Grid>
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
            sx={{ mb: 1 }}
            data-testid={
              isStreaming ? 'streaming-stop-button' : 'streaming-start-button'
            }
          >
            {isStreaming
              ? `STOP Streaming HR: ${hrValue} BPM`
              : 'START Continuous Stream'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={() => setCalories(0)}
            disabled={isStreaming}
            sx={{ mb: 3 }}
            fullWidth
          >
            Reset Calories ({Math.floor(calories)} kcal)
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
