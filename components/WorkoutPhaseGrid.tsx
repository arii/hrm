'use client'

import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  alpha,
} from '@mui/material'
import { WorkoutTableDto } from '@/types/workout'
import RefreshIconButton from './RefreshIconButton'
import { useIsScaledLayout } from '@/components/ScaledStage'
import {
  SCALED_WORKOUT_HEADER_REM,
  scaledExerciseFontRem,
} from '@/lib/workoutSizing'
import { withBasePath } from '@/utils/urls'

interface WorkoutPhaseGridProps {
  docId: string
  refreshKey?: number
  onRefresh?: () => void
}

export default function WorkoutPhaseGrid({
  docId,
  refreshKey,
  onRefresh,
}: WorkoutPhaseGridProps) {
  const [data, setData] = useState<WorkoutTableDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Scaled mode: larger fixed text (readable from afar) and cards
  // stretched to fill the canvas area.
  const isScaledLayout = useIsScaledLayout()

  useEffect(() => {
    if (!docId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null) // Reset error on re-fetch
        const res = await fetch(withBasePath(`/api/workout?docId=${docId}`))
        if (!res.ok) throw new Error('Failed to load workout data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [docId, refreshKey])

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ minHeight: '12.5rem' }}
        >
          <CircularProgress size={32} />
        </Box>
      )
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>
    }

    if (!data || data.headers.length === 0) {
      return (
        <Alert severity="info">No workout data found in this document.</Alert>
      )
    }

    // columns is tolerant of headers-only payloads (older mocks).
    const columns = data.columns ?? []
    // Size text from the tallest card so the grid uses all blank space
    // yet still fits without scrolling on the fixed canvas.
    const maxRows = columns.reduce(
      (tallest, column) => Math.max(tallest, column.length),
      0
    )

    return (
      <Box
        data-testid="workout-phase-grid"
        sx={{
          display: 'grid',
          gap: 2,
          // Auto-fit shares the row however many phases the day has (2 share
          // halves, 4 share quarters) instead of orphaning a wrapped card.
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          height: isScaledLayout ? '100%' : undefined,
        }}
      >
        {data.headers.map((header, index) => {
          const exercises = columns[index] ?? []
          return (
            <Card
              key={`${header}-${index}`}
              elevation={2}
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardContent
                sx={{
                  p: 2,
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    fontWeight: 700,
                    fontSize: isScaledLayout
                      ? `${SCALED_WORKOUT_HEADER_REM}rem`
                      : 'clamp(1.25rem, 1rem + 2vw, 2rem)',
                    lineHeight: 1.15,
                    textAlign: 'center',
                    textWrap: isScaledLayout ? 'balance' : undefined,
                  }}
                >
                  {header}
                </Typography>
                {exercises.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack
                      spacing={isScaledLayout ? 0.5 : 1}
                      sx={
                        isScaledLayout
                          ? { flexGrow: 1, justifyContent: 'space-evenly' }
                          : undefined
                      }
                    >
                      {exercises.map((exercise, i) => (
                        <Typography
                          key={i}
                          sx={{
                            fontSize: isScaledLayout
                              ? `${scaledExerciseFontRem(maxRows)}rem`
                              : 'clamp(1.125rem, 0.875rem + 1.75vw, 1.5rem)',
                            lineHeight: 1.2,
                            textWrap: isScaledLayout ? 'balance' : undefined,
                          }}
                        >
                          {exercise}
                        </Typography>
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </Box>
    )
  }

  return (
    <Box
      sx={{ position: 'relative', height: isScaledLayout ? '100%' : undefined }}
    >
      {onRefresh && (
        <RefreshIconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
          sx={(theme) => ({
            position: 'absolute',
            // Docked inside the corner: hanging off the edge (-8)
            // overflows the scroller and forces a horizontal scrollbar.
            top: 0,
            right: 0,
            zIndex: 10,
            width: 48,
            height: 48,
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            backdropFilter: 'blur(4px)',
            '&:hover': {
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
            },
          })}
        />
      )}
      {renderContent()}
    </Box>
  )
}
