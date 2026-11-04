'use client'

import { memo, useEffect, useState } from 'react'
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
import { withBasePath } from '@/utils/urls'
import { useUniformFitFontSize } from '@/hooks/useFitFontSize'
import { FIT_TYPE_MIN_PX, CARD_TYPE_MAX_PX } from '@/constants/layout'

interface WorkoutPhaseGridProps {
  docId: string
  refreshKey?: number
  onRefresh?: () => void
}

/**
 * One workout-phase card. Sized by the grid-level uniform fit (see
 * useUniformFitFontSize below): every card shares one size, the minimum
 * of their fits, so a dense card (up to the observed 11-line max) shrinks
 * all cards together. Child type uses em units so the measured wrapper's
 * px size cascades; ratios match the old rem ceilings (header 1.3em ~=
 * 36px, exercises 1em = 28px at max). Memoized: ancestor re-renders
 * (timer ticks, HR packets) skip the card entirely.
 */
// Stable empty-columns identity so memo props stay referentially equal.
const EMPTY_EXERCISES: string[] = []

const PhaseCard = memo(
  ({ header, exercises }: { header: string; exercises: string[] }) => {
    return (
      <Card
        elevation={2}
        sx={{
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CardContent
          sx={{ p: 0, flexGrow: 1, minHeight: 0, minWidth: 0, display: 'flex' }}
        >
          <Box
            data-testid="phase-card-content"
            sx={{
              fontSize: CARD_TYPE_MAX_PX,
              // Padding inside the measured box in em so it shrinks with
              // the fit (0.85em ~= 24px at max, the old p:3). Fixed px
              // chrome would defeat the fit at small sizes.
              padding: '0.85em',
              flexGrow: 1,
              minHeight: 0,
              minWidth: 0,
              // Zero-scroll contract: the fit (not a scrollbar) absorbs
              // overflow. Lines stay tight (no spread gaps); the uniform
              // size grows until the box is full.
              overflow: 'hidden',
              overflowWrap: 'break-word',
            }}
          >
            <Typography
              component="h3"
              sx={{
                fontWeight: 700,
                fontSize: '1.3em',
                lineHeight: 1.15,
                textAlign: 'center',
              }}
            >
              {header}
            </Typography>
            {exercises.length > 0 && (
              <>
                <Divider sx={{ my: '0.55em' }} />
                <Stack sx={{ gap: '0.4em' }}>
                  {exercises.map((exercise, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: '1em',
                        lineHeight: 1.25,
                      }}
                    >
                      {exercise}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    )
  }
)

PhaseCard.displayName = 'PhaseCard'

export default function WorkoutPhaseGrid({
  docId,
  refreshKey,
  onRefresh,
}: WorkoutPhaseGridProps) {
  const [data, setData] = useState<WorkoutTableDto | null>(null)
  // ONE shared size for all cards (minimum of their fits). Refit triggers
  // are React data (new fetch) and window resizes only -- the fit never
  // observes its own output, so it cannot oscillate.
  const gridWrapRef = useUniformFitFontSize<HTMLDivElement>(
    '[data-testid="phase-card-content"]',
    { minPx: FIT_TYPE_MIN_PX, maxPx: CARD_TYPE_MAX_PX, resetKey: data }
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          sx={{ height: '100%', minHeight: 200 }}
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

    // Exactly one track per phase: the cards always share a single row
    // (2 share halves, 4 share quarters) at any viewport width. minmax(0,…)
    // lets narrow tracks shrink below content minimums instead of wrapping.
    // The single row is pinned to the grid height so cards are truly
    // constrained: without it the row grows with content, the fit sees no
    // overflow, and the section clips instead of fitting.
    const trackCount = Math.max(1, data.headers.length)

    return (
      <Box
        data-testid="workout-phase-grid"
        sx={{
          display: 'grid',
          gap: 2,
          height: '100%',
          gridTemplateColumns: `repeat(${trackCount}, minmax(0, 1fr))`,
          gridTemplateRows: 'minmax(0, 1fr)',
        }}
      >
        {data.headers.map((header, index) => (
          <PhaseCard
            key={`${header}-${index}`}
            header={header}
            exercises={columns[index] ?? EMPTY_EXERCISES}
          />
        ))}
      </Box>
    )
  }

  return (
    <Box ref={gridWrapRef} sx={{ position: 'relative', height: '100%' }}>
      {onRefresh && (
        <RefreshIconButton
          onClick={onRefresh}
          aria-label="refresh workout table"
          sx={(theme) => ({
            position: 'absolute',
            top: -8,
            right: 8,
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
