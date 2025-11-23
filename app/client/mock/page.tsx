'use client'

import { HeartBroken, Science } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { useCallback, useEffect, useState, useRef } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import HrTile from '../../../components/HrTile'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmInputMessage } from '../../../types/websocket'
import { getHrZoneProps } from '../../../utils/visualization'

export default function MockPage() {
  const { sendData, connectionStatus } = useWebSocket()
  const [hrValue, setHrValue] = useState<number>(100)
  const [name, setName] = useState('Mock User')
  const [age, setAge] = useState(30)
  const [isStreaming, setIsStreaming] = useState(false)
  const [simulationProfile, setSimulationProfile] = useState('manual')

  const workerRef = useRef<Worker | null>(null)

  // Use refs for values needed in callbacks to avoid recreating callbacks/effects
  const nameRef = useRef(name)
  const ageRef = useRef(age)
  const maxHrRef = useRef(220 - age)

  useEffect(() => {
    nameRef.current = name
  }, [name])

  useEffect(() => {
    ageRef.current = age
    maxHrRef.current = 220 - age
  }, [age])

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
    (hr: number | null) => {
      const message: HrmInputMessage = {
        type: 'HRM_INPUT',
        data: {
          value: hr === null ? undefined : hr,
          maxHr: maxHrRef.current,
          name: nameRef.current,
          age: ageRef.current,
        },
      }
      sendData(message)
    },
    [sendData]
  )

  useEffect(() => {
    workerRef.current = new Worker('/workers/mockWorker.js')

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  useEffect(() => {
    if (!workerRef.current) return

    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'TICK') {
        const newHr = e.data.hr
        setHrValue(newHr !== null ? newHr : 0)
        sendHrPacket(newHr)
      }
    }
  }, [sendHrPacket])

  // Update baseHr in worker when it changes manually
  useEffect(() => {
    if (simulationProfile === 'manual' && workerRef.current) {
      workerRef.current.postMessage({
        type: 'CONFIG',
        payload: { mode: 'manual', baseHr: hrValue },
      })
    }
  }, [hrValue, simulationProfile])

  // Update worker configuration when parameters change
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'CONFIG',
        payload: { mode: simulationProfile, baseHr: hrValue },
      })
    }
  }, [simulationProfile, hrValue])

  // Handle manual changes specifically
  const handleManualChange = (newValue: number) => {
    setHrValue(newValue)
    if (!isStreaming) {
      sendHrPacket(newValue)
    }
  }

  const startStreaming = () => {
    if (isStreaming || connectionStatus !== 'Connected') return
    setIsStreaming(true)

    // Sync current state before starting
    workerRef.current?.postMessage({
      type: 'CONFIG',
      payload: { mode: simulationProfile, baseHr: hrValue },
    })

    workerRef.current?.postMessage({ type: 'START' })
  }

  const stopStreaming = () => {
    setIsStreaming(false)
    workerRef.current?.postMessage({ type: 'STOP' })
  }

  const handleProfileChange = (
    event: React.MouseEvent<HTMLElement>,
    newProfile: string | null
  ) => {
    if (newProfile !== null) {
      setSimulationProfile(newProfile)
    }
  }

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    const newValue = isNaN(value) ? 0 : value
    handleManualChange(newValue)
  }

  const setHrByZone = (zone: 'grey' | 'blue' | 'green' | 'yellow' | 'red') => {
    const zones = {
      grey: 95,
      blue: 115,
      green: 135,
      yellow: 155,
      red: 175,
    }
    handleManualChange(zones[zone])
  }

  const hrZoneProps = getHrZoneProps(hrValue, maxHr)

  return (
    <>
      <Container maxWidth="md" sx={{ py: 3, pb: 10 }}>
        <Grid container spacing={3}>
          {/* Left Column: Controls */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3, textAlign: 'center', height: '100%' }}>
              <Science color="primary" sx={{ fontSize: 60, mb: 2 }} />
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontWeight: 'bold', mb: 2 }}
              >
                HRM Mock Streamer
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={8}>
                  <TextField
                    label="User Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value, 10))}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" align="left" sx={{ mb: 1 }}>
                Simulation Profile
              </Typography>
              <ToggleButtonGroup
                value={simulationProfile}
                exclusive
                onChange={handleProfileChange}
                aria-label="simulation profile"
                fullWidth
                size="small"
                sx={{ mb: 3 }}
                orientation="vertical"
              >
                <ToggleButton value="manual" aria-label="manual">
                  Manual Control
                </ToggleButton>
                <ToggleButton value="intervals" aria-label="intervals">
                  Intervals (170/110)
                </ToggleButton>
                <ToggleButton value="steady" aria-label="steady">
                  Steady Ramp (Max 140)
                </ToggleButton>
                <ToggleButton value="drop" aria-label="signal drop">
                  Signal Drop (Null)
                </ToggleButton>
              </ToggleButtonGroup>

              {simulationProfile === 'manual' && (
                <>
                  <TextField
                    label="Target BPM"
                    type="number"
                    value={hrValue}
                    onChange={handleValueChange}
                    variant="outlined"
                    fullWidth
                    size="medium"
                    sx={{ mb: 2 }}
                    disabled={isStreaming}
                  />

                  <Grid container spacing={1} sx={{ mb: 3 }}>
                    <Grid item xs>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#9E9E9E',
                          minWidth: 'auto',
                          px: 0,
                        }}
                        onClick={() => setHrByZone('grey')}
                      >
                        Z1
                      </Button>
                    </Grid>
                    <Grid item xs>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#2196F3',
                          minWidth: 'auto',
                          px: 0,
                        }}
                        onClick={() => setHrByZone('blue')}
                      >
                        Z2
                      </Button>
                    </Grid>
                    <Grid item xs>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#4CAF50',
                          minWidth: 'auto',
                          px: 0,
                        }}
                        onClick={() => setHrByZone('green')}
                      >
                        Z3
                      </Button>
                    </Grid>
                    <Grid item xs>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#FFEB3B',
                          color: 'black',
                          minWidth: 'auto',
                          px: 0,
                        }}
                        onClick={() => setHrByZone('yellow')}
                      >
                        Z4
                      </Button>
                    </Grid>
                    <Grid item xs>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: '#F44336',
                          minWidth: 'auto',
                          px: 0,
                        }}
                        onClick={() => setHrByZone('red')}
                      >
                        Z5
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}

              <Button
                variant="contained"
                size="large"
                color={isStreaming ? 'error' : 'primary'}
                onClick={isStreaming ? stopStreaming : startStreaming}
                disabled={connectionStatus !== 'Connected'}
                startIcon={<HeartBroken />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {isStreaming ? `STOP Stream` : 'START Stream'}
              </Button>

              <Box
                sx={{
                  p: 1,
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
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  Status: {connectionStatus}
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Right Column: Visualization */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                  Outgoing Data Stream
                </Typography>
                <HrTile
                  name={name}
                  bpm={hrValue}
                  percentMax={hrZoneProps.percentage}
                  background={hrZoneProps.progressColor}
                />

                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{ overflowX: 'auto' }}
                  >
                    {`{
  "type": "HRM_INPUT",
  "data": {
    "value": ${hrValue},
    "maxHr": ${maxHr},
    "name": "${name}",
    "age": ${age}
  }
}`}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <BottomNavBar />
    </>
  )
}
