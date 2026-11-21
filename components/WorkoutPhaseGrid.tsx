'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
import { useInScaledStage } from '@/components/ScaledStage'
import { SCALED_CANVAS_SELECTOR } from '@/constants/layout'
import {
  computeWorkoutFit,
  createWorkoutTextMeasurer,
  fitHeaderRem,
  REFERENCE_FONT_PX,
  type WorkoutFit,
} from '@/lib/workoutSizing'
import { withBasePath } from '@/utils/urls'

// Fallbacks paint only before the first (gated) recompute lands — the
// same neutral starting size the previous implementation initialized
// with. The scaled-canvas override reads the custom properties set by
// the one-shot fit; without them the responsive clamp holds.
const FALLBACK_EXERCISE_REM = '2.4rem'
const FALLBACK_HEADER_REM = '2.52rem'

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
  // Scaled mode: text sized from the one-shot fit below. This is the
  // one honest remaining regime branch: the canvas presentation runs
  // the JS fit (state-driven font rem), which is a different
  // composition per regime, not a different size — spec D1 reversal
  // condition. The stage context defaults to false outside ScaledStage,
  // so standalone mounts read responsive, matching the retired
  // context's semantics.
  const isScaledLayout = useInScaledStage()
  const gridRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<WorkoutFit | null>(null)
  const [headerSizes, setHeaderSizes] = useState<number[]>([])

  // The one sizing computation. Deterministic and idempotent: it
  // measures the loaded font once, feeds the pure fit, and replaces the
  // sizes wholesale. It never adjusts a previous result, so no number
  // of triggers can step or ratchet the text.
  const recomputeFit = useCallback(() => {
    const grid = gridRef.current
    if (!grid || !data) return
    // Zero-area boxes (first paint, hidden mounts) carry no fit
    // information; the ResizeObserver re-runs this once a real box
    // exists. Full recomputes are harmless at any settled size.
    if (grid.clientWidth <= 0 || grid.clientHeight <= 0) return
    const result = computeWorkoutFit({
      box: { widthPx: grid.clientWidth, heightPx: grid.clientHeight },
      content: { headers: data.headers, columns: data.columns ?? [] },
      fontMetrics: createWorkoutTextMeasurer(getComputedStyle(grid).fontFamily),
    })
    const sizes = Array.from(
      grid.querySelectorAll<HTMLElement>(
        '[data-testid="workout-phase-header"]'
      ),
      (header) => {
        const style = getComputedStyle(header)
        const metrics = createWorkoutTextMeasurer(
          style.fontFamily,
          style.fontWeight
        )
        const widestToken = Math.max(
          0,
          ...(header.textContent ?? '')
            .split(/\s+/)
            .map(
              (token) =>
                metrics.measureTextPx(token) *
                ((result.headerRem * 16) / REFERENCE_FONT_PX)
            )
        )
        return fitHeaderRem(result.headerRem, header.clientWidth, widestToken)
      }
    )
    setHeaderSizes((prev) =>
      prev.length === sizes.length && prev.every((size, i) => size === sizes[i])
        ? prev
        : sizes
    )
    setFit((prev) =>
      prev &&
      prev.exerciseRem === result.exerciseRem &&
      prev.headerRem === result.headerRem
        ? prev
        : result
    )
  }, [data])

  useEffect(() => {
    if (!isScaledLayout || !data) return
    const grid = gridRef.current
    if (!grid) return
    let cancelled = false
    // One animation frame per trigger at most: coalesces ResizeObserver
    // bursts during drags. Idempotence makes correctness independent of
    // frequency.
    const run = () => {
      if (!cancelled) recomputeFit()
    }
    const schedule = () => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(run)
      } else {
        // Environments without rAF (older jsdom): compute directly.
        run()
      }
    }
    // First-paint metrics must come from the loaded font, not the
    // fallback (the #9839 lesson): the first computation is gated on
    // document.fonts.ready. Optional chaining covers environments
    // without the Font API (jsdom/tests) — it resolves immediately.
    ;(document.fonts?.ready ?? Promise.resolve()).then(run).catch(() => {
      // Font API failure: no fit is better than a fallback-metric fit
      // baked in unnoticed; the ResizeObserver trigger still recomputes.
    })
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver((entries) => {
            if (
              cancelled ||
              !entries.some(
                (entry) =>
                  entry.contentRect.width > 0 && entry.contentRect.height > 0
              )
            ) {
              return
            }
            schedule()
          })
    observer?.observe(grid)
    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [isScaledLayout, data, recomputeFit])

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

  // Canvas-only custom properties: the scaled override below reads
  // them, responsive mode never sees them.
  const fitStyle = {
    '--workout-exercise-font-rem': fit ? `${fit.exerciseRem}rem` : undefined,
    '--workout-header-font-rem': fit ? `${fit.headerRem}rem` : undefined,
  } as CSSProperties

  const renderContent = () => {
    if (loading && !data) {
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
        style={fitStyle}
        aria-busy={loading}
        sx={{
          // A manual refresh keeps the cards and dims them until the
          // reload lands, so the tap visibly does something.
          opacity: loading && data ? 0.5 : 1,
          transition: 'opacity 0.2s',
          display: 'grid',
          gap: 2,
          // Auto-fit shares the row however many phases the day has (2 share
          // halves, 4 share quarters) instead of orphaning a wrapped card.
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          // The canvas always shows one row of equal columns, whatever
          // the phase count, so the cards never wrap or leave a gap.
          [SCALED_CANVAS_SELECTOR]: {
            gridTemplateColumns: `repeat(${data.headers.length}, minmax(0, 1fr))`,
            gridTemplateRows: 'minmax(0, 1fr)',
          },
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <Typography
                    component="h3"
                    data-testid="workout-phase-header"
                    style={
                      isScaledLayout && headerSizes[index] !== undefined
                        ? ({
                            '--workout-header-font-rem': `${headerSizes[index]}rem`,
                          } as CSSProperties)
                        : undefined
                    }
                    sx={{
                      flex: '1 1 0',
                      minWidth: 0,
                      fontWeight: 700,
                      fontSize: 'clamp(1.25rem, 1rem + 2vw, 2rem)',
                      [SCALED_CANVAS_SELECTOR]: {
                        fontSize: `var(--workout-header-font-rem, ${FALLBACK_HEADER_REM})`,
                      },
                      lineHeight: 1.15,
                      textAlign: 'center',
                      textWrap: isScaledLayout ? 'balance' : undefined,
                    }}
                  >
                    {header}
                  </Typography>
                </Box>
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
                            fontSize:
                              'clamp(1.125rem, 0.875rem + 1.75vw, 1.5rem)',
                            [SCALED_CANVAS_SELECTOR]: {
                              fontSize: `var(--workout-exercise-font-rem, ${FALLBACK_EXERCISE_REM})`,
                            },
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
          spinning={loading}
          aria-label="refresh workout table"
          data-testid="refresh-icon-button"
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
