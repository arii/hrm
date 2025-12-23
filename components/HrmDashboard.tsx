// File: components/HrmDashboard.tsx
'use client'
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import HrmHistoryChart from './HrmHistoryChart'
import HrmSummary from './HrmSummary'
import HrmZones from './HrmZones'
import { HrmDataPoint } from '../services/hrmDataService'
import { useWebSocket } from '@/context/WebSocketContext'

type TimeRange = 'hour' | 'day' | 'all'

const HrmDashboard = () => {
  const [data, setData] = useState<HrmDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { hrmData } = useWebSocket()
  const [timeRange, setTimeRange] = useState<TimeRange>('all')

  const fetchData = async (range: TimeRange) => {
    setLoading(true)
    let url = '/api/hrm'
    if (range !== 'all') {
      const since = new Date()
      if (range === 'hour') {
        since.setHours(since.getHours() - 1)
      } else if (range === 'day') {
        since.setDate(since.getDate() - 1)
      }
      url += `?since=${since.getTime()}`
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch HRM data')
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(timeRange)
  }, [timeRange])

  useEffect(() => {
    if (hrmData.length > 0) {
      const newDataPoints = hrmData
        .filter((d) => d.value !== null)
        .map((d) => ({
          timestamp: Date.now(),
          hrm: d.value as number,
          clientId: d.clientId,
        }))
      setData((prevData) => [...prevData, ...newDataPoints])
    }
  }, [hrmData])

  if (loading) {
    return <Typography>Loading dashboard...</Typography>
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Heart Rate Analytics
        </Typography>
        <ButtonGroup>
          <Button
            onClick={() => setTimeRange('hour')}
            variant={timeRange === 'hour' ? 'contained' : 'outlined'}
          >
            Last Hour
          </Button>
          <Button
            onClick={() => setTimeRange('day')}
            variant={timeRange === 'day' ? 'contained' : 'outlined'}
          >
            Last Day
          </Button>
          <Button
            onClick={() => setTimeRange('all')}
            variant={timeRange === 'all' ? 'contained' : 'outlined'}
          >
            All Time
          </Button>
        </ButtonGroup>
      </Box>
      <HrmSummary data={data} />
      <HrmZones data={data} />
      <HrmHistoryChart data={data} />
    </Box>
  )
}

export default HrmDashboard
