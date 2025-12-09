'use client'
import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Stack,
  CircularProgress,
  Divider,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { WorkoutSession } from '@/types/data-models'

const HistoryList = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        setSessions(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch history', err)
        setLoading(false)
      })
  }, [])

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {sessions.map((session) => (
        <Card
          key={session.id}
          variant="outlined"
          sx={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <CardContent sx={{ '&:last-child': { pb: 2 } }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() =>
                setExpandedId(expandedId === session.id ? null : session.id)
              }
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <CalendarMonthIcon fontSize="small" color="primary" />
                  {new Date(session.startedAt).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.phases.length} Phases •{' '}
                  {session.phases.reduce(
                    (acc, p) => acc + p.exercises.length,
                    0
                  )}{' '}
                  Exercises
                </Typography>
              </Box>

              <IconButton
                sx={{
                  transform:
                    expandedId === session.id
                      ? 'rotate(180deg)'
                      : 'rotate(0deg)',
                  transition: '0.3s',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>

            <Collapse in={expandedId === session.id}>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={2}>
                {session.phases.map((phase, idx) => (
                  <Box key={idx}>
                    <Chip
                      label={phase.name}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                    <Box
                      component="ul"
                      sx={{
                        m: 0,
                        pl: 2,
                        typography: 'body2',
                        color: 'text.secondary',
                      }}
                    >
                      {phase.exercises.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Collapse>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

export default HistoryList
