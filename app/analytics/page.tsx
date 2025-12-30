// app/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Container,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Paper,
  Box,
} from '@mui/material'
import { HrmDataLogEntry } from '../../services/HrmDataLogger'

const AnalyticsPage = () => {
  const [sessions, setSessions] = useState<string[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<HrmDataLogEntry[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingSessionData, setLoadingSessionData] = useState(false)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/analytics/sessions')
        const data = await response.json()
        setSessions(data.sessions)
      } catch (error) {
        console.error('Error fetching sessions:', error)
      } finally {
        setLoadingSessions(false)
      }
    }

    fetchSessions()
  }, [])

  const handleSessionClick = async (sessionId: string) => {
    setSelectedSession(sessionId)
    setLoadingSessionData(true)
    try {
      const response = await fetch(`/api/analytics/sessions/${sessionId}`)
      const data = await response.json()
      setSessionData(data.data)
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoadingSessionData(false)
    }
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Heart Rate Analytics
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 4 }}>
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Sessions
          </Typography>
          {loadingSessions ? (
            <CircularProgress />
          ) : sessions.length === 0 ? (
            <Typography>No sessions found.</Typography>
          ) : (
            <List>
              {sessions.map((sessionId) => (
                <ListItemButton
                  key={sessionId}
                  selected={selectedSession === sessionId}
                  onClick={() => handleSessionClick(sessionId)}
                >
                  <ListItemText primary={sessionId} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
        <Paper elevation={3} sx={{ p: 2 }}>
          {loadingSessionData ? (
            <CircularProgress />
          ) : selectedSession ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={sessionData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name="Heart Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography>Select a session to view the data.</Typography>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default AnalyticsPage
