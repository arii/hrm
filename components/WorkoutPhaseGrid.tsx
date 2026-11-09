'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
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

  // Refit generation: bumped by layout-settle signals (ResizeObserver,
  // webfont resolution) so the single measuring pass below re-runs
  // post-commit. Settle handlers never step the font themselves — they
  // only restore the data-driven base and bump this counter — so any
  // number of overlapping settle signals converges to one deterministic
  // size instead of ratcheting down once per signal.
  const [fitEpoch, setFitEpoch] = useState(0)
  // Data-driven ceiling: the roomiest size the content estimate allows.
  // Every fit starts here; measurement only ever steps down from it, so
  // a transient false overflow can never permanently shrink the text.
  const baseFontRem = data
    ? scaledExerciseFontRem(data.columns ?? [], data.headers.length)
    : null
  // Guards the measuring pass so a repeated run with no new information
  // (same base, font, epoch, and grid box — e.g. StrictMode double
  // effects) can never step twice for one layout.
  const measuredKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (data && baseFontRem !== null) {
      setFontSizeRem(baseFontRem)
    }
  }, [data, baseFontRem])

  // Restore the data-driven base and schedule exactly one fresh measuring
  // pass. Called on discrete layout-settle signals only.
  const requestRefit = useCallback(() => {
    if (baseFontRem !== null) {
      setFontSizeRem(baseFontRem)
    }
    measuredKeyRef.current = null
    setFitEpoch((epoch) => epoch + 1)
  }, [baseFontRem])

  // Single measuring pass over the rendered cards. Runs post-commit
  // (layout effect: measures the just-committed font before paint) and
  // converges one 0.1 step per commit from the base toward the largest
  // size that fits — never upward within a pass, never twice for the
  // same layout. Skips unsettled (zero/near-zero height) layouts so a
  // first-paint measurement can never lock in a wrong size; the
  // ResizeObserver below re-runs this once the container settles.
  useLayoutEffect(() => {
    if (!isScaledLayout || !gridRef.current || baseFontRem === null) return
    const grid = gridRef.current
    if (grid.clientHeight < MIN_SETTLED_CONTAINER_PX) return
    const key = `${baseFontRem}|${fontSizeRem}|${fitEpoch}|${grid.clientWidth}x${grid.clientHeight}`
    if (measuredKeyRef.current === key) return
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.MuiCard-root')
    )
    if (cards.length === 0) return
    if (cards.some((card) => card.clientHeight < MIN_SETTLED_CONTAINER_PX)) {
      return
    }
    measuredKeyRef.current = key
    // The grid itself is measured too: inside the scrollable workout
    // section, cards size to their content (no card-level overflow) while
    // the fixed-height grid overflows — card-only measurement misses that
    // case entirely and leaves oversized text in place.
    const hasOverflow =
      grid.scrollHeight > grid.clientHeight + 1 ||
      grid.scrollWidth > grid.clientWidth + 1 ||
      cards.some((card) => {
        const content = card.querySelector<HTMLElement>('.MuiCardContent-root')
        return (
          (content && content.scrollHeight > content.clientHeight + 1) ||
          card.scrollHeight > card.clientHeight + 1
        )
      })
    if (hasOverflow) {
      setFontSizeRem((prev) => Math.max(1.4, Number((prev - 0.1).toFixed(2))))
    }
  }, [baseFontRem, fitEpoch, fontSizeRem, isScaledLayout])

  // Refit after web fonts resolve and the frame paints: fallback font
  // metrics differ from the final ones, so a fit that ran early restores
  // to base here and re-converges on the real metrics. Plus a bounded
  // settle window: after data arrives, layout keeps settling (flex
  // resolution, late webfonts, WS-driven tiles) without changing the
  // grid box — which no observer can see. Refitting from base on a short
  // schedule guarantees the final pass measures settled layout, so every
  // load converges to the same size. All timers die with the effect.
  useEffect(() => {
    if (!data) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const runDeferred = async () => {
      try {
        await document.fonts?.ready
      } catch {
        // Font API unavailable (jsdom/tests): fall through to rAF.
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!cancelled) requestRefit()
        })
      } else if (!cancelled) {
        requestRefit()
      }
    }
    runDeferred()
    for (const delayMs of [500, 1500, 3000]) {
      timers.push(
        setTimeout(() => {
          if (!cancelled) requestRefit()
        }, delayMs)
      )
    }
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [data, requestRefit])

  // Refit whenever the grid container's own box settles or changes
  // (initial flex resolution, ScaledStage scaling, viewport changes).
  // No manual refresh click required.
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || typeof ResizeObserver === 'undefined') return
    let cancelled = false
    const schedule = () => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!cancelled) requestRefit()
        })
      } else if (!cancelled) {
        requestRefit()
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
  }, [data, requestRefit])

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
