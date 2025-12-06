// app/history/page.tsx
'use client'
import React, { useEffect, useState } from 'react'
import { Container, Typography, Box, CircularProgress } from '@mui/material'
import { WorkoutHistory } from '@/types'
import WorkoutHistoryTable from '@/components/WorkoutHistoryTable'

const HistoryPage = () => {
  const [history, setHistory] = useState<WorkoutHistory>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/workout-history')
        const data = await response.json()
        setHistory(data)
      } catch (error) {
        console.error('Failed to fetch workout history:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workout History
      </Typography>
      <Box>
        {loading ? (
          <CircularProgress />
        ) : (
          <WorkoutHistoryTable history={history} />
        )}
      </Box>
    </Container>
  )
}

export default HistoryPage
