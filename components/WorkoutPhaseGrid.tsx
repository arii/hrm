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

// Fit probe bounds (rem) for the synchronous pre-paint measuring pass.
const FIT_FLOOR_REM = 1.4
const FIT_STEP_REM = 0.1

// Diagnostic overlay (?fontdebug=1): reports the live fit state so a
// target machine its developer cannot reach can still report ground
// truth. Self-contained polling; inert unless the query flag is set.
function FitDebugOverlay({
  baseFontRem,
  fontSizeRem,
  fitEpoch,
}: {
  baseFontRem: number | null
  fontSizeRem: number
  fitEpoch: number
}) {
  const [text, setText] = useState('fitdbg…')
  useEffect(() => {
    const id = setInterval(() => {
      const grid = document.querySelector<HTMLElement>(
        '[data-testid="workout-phase-grid"]'
      )
      const cards = grid
        ? Array.from(grid.querySelectorAll<HTMLElement>('.MuiCard-root'))
        : []
      const ex = document.querySelector<HTMLElement>(
        '[data-testid="workout-exercise-text"]'
      )
      const overflow = grid
        ? grid.scrollHeight > grid.clientHeight + 1 ||
          cards.some(
            (card) =>
              card.scrollHeight > card.clientHeight + 1 ||
              (card.querySelector<HTMLElement>('.MuiCardContent-root')
                ?.scrollHeight ?? 0) >
                (card.querySelector<HTMLElement>('.MuiCardContent-root')
                  ?.clientHeight ?? 0) +
                  1
          )
        : null
      setText(
        `base=${baseFontRem} cur=${fontSizeRem} rendered=${ex ? getComputedStyle(ex).fontSize : '—'} epoch=${fitEpoch} ` +
          `grid=${grid ? `${grid.clientWidth}x${grid.clientHeight}` : '—'} ` +
          `cards=${cards.length} overflow=${overflow} ` +
          `vp=${window.innerWidth}x${window.innerHeight} dpr=${window.devicePixelRatio}`
      )
    }, 500)
    return () => clearInterval(id)
  }, [baseFontRem, fontSizeRem, fitEpoch])
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 9999,
        backgroundColor: 'black',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 12,
        p: 1,
        borderRadius: 1,
        maxWidth: '90vw',
      }}
    >
      {text}
    </Box>
  )
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
  // webfont resolution, settle window) so the single measuring pass below
  // re-runs post-commit. Settle handlers never touch the font themselves —
  // they only bump this counter — and each pass commits at most one
  // pre-computed size, so overlapping signals converge instead of
  // oscillating.
  const [fitEpoch, setFitEpoch] = useState(0)
  // Data-driven ceiling: the roomiest size the content estimate allows.
  // Every fit starts here; measurement only ever steps down from it, so
  // a transient false overflow can never permanently shrink the text.
  const baseFontRem = data
    ? scaledExerciseFontRem(data.columns ?? [], data.headers.length)
    : null
  // Guards the measuring pass so a repeated run with no new information
  // (same base, epoch, and grid box — e.g. StrictMode double effects)
  // never probes twice for one layout.
  const measuredKeyRef = useRef<string | null>(null)

  // Seed the data-driven base when the payload changes. A layout effect
  // (not passive) declared before the probe below, so both run pre-paint:
  // the probe converges from this base in the same commit and the base
  // itself never paints. Runs once per payload — never on settle
  // signals, which is what keeps refits from oscillating.
  useLayoutEffect(() => {
    if (data && baseFontRem !== null) {
      setFontSizeRem(baseFontRem)
    }
  }, [data, baseFontRem])

  // Schedule exactly one fresh measuring pass. Called on discrete
  // layout-settle signals only. The pass probes from the base itself,
  // so no reset is needed — and none happens, which is what keeps
  // refits from visibly oscillating.
  const requestRefit = useCallback(() => {
    measuredKeyRef.current = null
    setFitEpoch((epoch) => epoch + 1)
  }, [])

  // Single measuring pass over the rendered cards. Probes candidate
  // sizes SYNCHRONOUSLY — pre-paint DOM writes plus forced reflows, so
  // intermediate candidates never render — from the base down to the
  // floor, then commits the largest fitting size with ONE setState. A
  // pass therefore paints at most one font change (and usually none),
  // so refits can never visibly oscillate. Skips unsettled
  // (zero/near-zero height) layouts so a first-paint measurement can
  // never lock in a wrong size; the settle signals below re-run this on
  // settled layout.
  useLayoutEffect(() => {
    if (!isScaledLayout || !gridRef.current || baseFontRem === null) return
    const grid = gridRef.current
    if (grid.clientHeight < MIN_SETTLED_CONTAINER_PX) return
    const key = `${baseFontRem}|${fitEpoch}|${grid.clientWidth}x${grid.clientHeight}`
    if (measuredKeyRef.current === key) return
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.MuiCard-root')
    )
    if (cards.length === 0) return
    if (cards.some((card) => card.clientHeight < MIN_SETTLED_CONTAINER_PX)) {
      return
    }
    const exercises = Array.from(
      grid.querySelectorAll<HTMLElement>(
        '[data-testid="workout-exercise-text"]'
      )
    )
    const headers = Array.from(
      grid.querySelectorAll<HTMLElement>('[data-testid="workout-phase-header"]')
    )
    if (exercises.length === 0) return
    measuredKeyRef.current = key
    // The grid itself is measured too: inside the scrollable workout
    // section, cards size to their content (no card-level overflow) while
    // the fixed-height grid overflows — card-only measurement misses that
    // case entirely and leaves oversized text in place.
    const hasOverflow = (): boolean =>
      grid.scrollHeight > grid.clientHeight + 1 ||
      grid.scrollWidth > grid.clientWidth + 1 ||
      cards.some((card) => {
        const content = card.querySelector<HTMLElement>('.MuiCardContent-root')
        return (
          (content && content.scrollHeight > content.clientHeight + 1) ||
          card.scrollHeight > card.clientHeight + 1
        )
      })
    let fit = FIT_FLOOR_REM
    let candidate = baseFontRem
    for (let i = 0; i < 40 && candidate >= FIT_FLOOR_REM - 1e-9; i += 1) {
      const rounded = Number(candidate.toFixed(2))
      const headerRem = scaledWorkoutHeaderRem(rounded)
      exercises.forEach((el) => {
        el.style.fontSize = `${rounded}rem`
      })
      headers.forEach((el) => {
        el.style.fontSize = `${headerRem}rem`
      })
      if (!hasOverflow()) {
        fit = rounded
        break
      }
      candidate = rounded - FIT_STEP_REM
    }
    exercises.forEach((el) => {
      el.style.removeProperty('font-size')
    })
    headers.forEach((el) => {
      el.style.removeProperty('font-size')
    })
    if (fit !== fontSizeRem) {
      setFontSizeRem(fit)
    }
  }, [baseFontRem, fitEpoch, fontSizeRem, isScaledLayout])

  // First-paint gate: hold the loading spinner until webfonts resolve
  // (plus one frame) so the first probe measures real metrics and the
  // first paint is already the final size. Refresh refetches skip the
  // wait: layout is settled by then. The timeout forces the gate so slow
  // fonts can delay content, never block it.
  const [fontsReady, setFontsReady] = useState(false)
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
    timers.push(
      setTimeout(() => {
        if (!cancelled) setFontsReady(true)
      }, 1500)
    )
    const runDeferred = async () => {
      try {
        await document.fonts?.ready
      } catch {
        // Font API unavailable (jsdom/tests): fall through to rAF.
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (!cancelled) {
            setFontsReady(true)
            requestRefit()
          }
        })
      } else if (!cancelled) {
        setFontsReady(true)
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
  // No manual refresh click required. Depends on the font gate: the
  // grid only mounts once fonts resolve, and this effect must re-run
  // for that commit or the observer never attaches.
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
  }, [data, fontsReady, requestRefit])

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
    // Gated on fontsReady once data exists: first paint then measures
    // real font metrics. Skipped when there is no data (config errors
    // must still render) and irrelevant on refetches (already true).
    if (loading || (data !== null && !fontsReady)) {
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
                  data-testid="workout-phase-header"
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

  // Debug overlay flag (?fontdebug=1). Read once per mount; the URL
  // does not change under the component.
  const [showFitDebug] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('fontdebug')
  )

  return (
    <Box
      sx={{ position: 'relative', height: isScaledLayout ? '100%' : undefined }}
    >
      {showFitDebug && (
        <FitDebugOverlay
          baseFontRem={baseFontRem}
          fontSizeRem={fontSizeRem}
          fitEpoch={fitEpoch}
        />
      )}
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
