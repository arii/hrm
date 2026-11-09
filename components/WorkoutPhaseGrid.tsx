'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  MIN_SETTLED_CONTAINER_PX,
  scaledExerciseFontRem,
  scaledWorkoutHeaderRem,
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
  const gridRef = useRef<HTMLDivElement>(null)

  const [fontSizeRem, setFontSizeRem] = useState<number>(2.4)

  useEffect(() => {
    if (data) {
      setFontSizeRem(
        scaledExerciseFontRem(data.columns ?? [], data.headers.length)
      )
    }
  }, [data])

  // Single overflow pass over the rendered cards. Skips unsettled
  // (zero/near-zero height) layouts so a first-paint measurement can
  // never lock in a wrong size; the ResizeObserver below re-runs this
  // once the container settles.
  const recalculateSizes = useCallback(() => {
    if (!isScaledLayout || !gridRef.current) return
    const grid = gridRef.current
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.MuiCard-root')
    )
    if (cards.length === 0) return
    if (cards.some((card) => card.clientHeight < MIN_SETTLED_CONTAINER_PX)) {
      return
    }
    const hasOverflow = cards.some((card) => {
      const content = card.querySelector<HTMLElement>('.MuiCardContent-root')
      return (
        (content && content.scrollHeight > content.clientHeight + 1) ||
        card.scrollHeight > card.clientHeight + 1
      )
    })
    if (hasOverflow) {
      setFontSizeRem((prev) => Math.max(1.4, Number((prev - 0.1).toFixed(2))))
    }
  }, [isScaledLayout])

  useEffect(() => {
    recalculateSizes()
  }, [data, fontSizeRem, isScaledLayout, recalculateSizes])

  // Re-measure after web fonts resolve and the frame paints: fallback
  // font metrics differ from the final ones, so a pass that ran early
  // can settle on the wrong size.
  useEffect(() => {
    if (!data) return
    let cancelled = false
    const runDeferred = async () => {
      try {
        await document.fonts?.ready
      } catch {
        // Font API unavailable (jsdom/tests): fall through to rAF.
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!cancelled) recalculateSizes()
        })
      } else if (!cancelled) {
        recalculateSizes()
      }
    }
    runDeferred()
    return () => {
      cancelled = true
    }
  }, [data, recalculateSizes])

  // Re-measure whenever the grid container's own box settles or
  // changes (initial flex resolution, ScaledStage scaling, viewport
  // changes). No manual refresh click required.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    let cancelled = false
    const schedule = () => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!cancelled) recalculateSizes()
        })
      } else if (!cancelled) {
        recalculateSizes()
      }
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          schedule()
        }
      }
    })
    observer.observe(grid)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [data, recalculateSizes])

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

    return (
      <Box
        ref={gridRef}
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
                  p: isScaledLayout ? 1.5 : 2,
                  '&:last-child': {
                    pb: isScaledLayout ? 1.5 : 2,
                  },
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
                      ? `${scaledWorkoutHeaderRem(fontSizeRem)}rem`
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
                    <Divider sx={{ my: isScaledLayout ? 1 : 1.5 }} />
                    <Stack
                      spacing={isScaledLayout ? 0.75 : 1}
                      sx={
                        isScaledLayout
                          ? { flexGrow: 1, justifyContent: 'flex-start' }
                          : undefined
                      }
                    >
                      {exercises.map((exercise, i) => (
                        <Typography
                          key={i}
                          data-testid="workout-exercise-text"
                          sx={{
                            fontSize: isScaledLayout
                              ? `${fontSizeRem}rem`
                              : 'clamp(1.125rem, 0.875rem + 1.75vw, 1.5rem)',
                            lineHeight: isScaledLayout ? 1.15 : 1.2,
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
