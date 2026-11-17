// File: components/TimerDisplay.tsx
'use client'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import VolumeOff from '@mui/icons-material/VolumeOff'
import VolumeUp from '@mui/icons-material/VolumeUp'
import { memo, useEffect, useState, useSyncExternalStore } from 'react'
import { formatDuration } from '@/lib/utils'
import { useTheme } from '@mui/material/styles'
import { SCALED_CANVAS_SELECTOR } from '@/constants/layout'
import type { TimerMode, TimerPhase } from '@/types/core'
import { audioManager, DEFAULT_BEEP_PREFERENCE } from '@/utils/audioManager'
import { useDashboardTimerControl } from '@/components/DashboardTimerControl'

// Theme colors the phase policy needs, passed in so the policy stays
// pure (no private hex values; the timer shares the dashboard palette).
export interface TimerPhasePalette {
  warningDark: string
  infoMain: string
  errorMain: string
  successMain: string
  textSecondary: string
}

interface TimerPhaseVisual {
  displayTime: string
  phaseColor: string
  phaseLabel: string
}

// TABATA sub-policy: WORK/REST/COOLDOWN color and label. The caller
// guarantees a TABATA phase, so anything else is COOLDOWN by elimination.
const resolveTabataPhase = (
  currentPhase: TimerPhase,
  palette: TimerPhasePalette
): { phaseColor: string; phaseLabel: string } =>
  currentPhase === 'WORK'
    ? { phaseColor: palette.errorMain, phaseLabel: 'WORK' }
    : currentPhase === 'REST'
      ? { phaseColor: palette.successMain, phaseLabel: 'REST' }
      : { phaseColor: palette.infoMain, phaseLabel: 'COOLDOWN' }

// Phase display policy: which time, color, and label each mode/phase
// combination shows. Pure: unit-tested, including the mode-gated
// fallbacks (a phase outside its mode renders ready, never stale).
export const resolveTimerPhaseVisual = (
  input: {
    mode: TimerMode
    currentPhase: TimerPhase
    timeRemaining: number
    timeElapsed: number
  },
  palette: TimerPhasePalette
): TimerPhaseVisual => {
  // PREPARE: Show countdown seconds only
  if (input.currentPhase === 'PREPARE') {
    return {
      displayTime: String(input.timeRemaining).padStart(2, '0'),
      phaseColor: palette.warningDark,
      phaseLabel: 'GET READY',
    }
  }
  // STOPWATCH: Show elapsed time MM:SS
  if (input.mode === 'STOPWATCH' && input.currentPhase === 'RUNNING') {
    return {
      displayTime: formatDuration(input.timeElapsed, {
        unit: 'seconds',
        format: 'MM:SS',
      }),
      phaseColor: palette.infoMain,
      phaseLabel: 'RUNNING',
    }
  }
  // TABATA: Show remaining time MM:SS
  if (
    input.mode === 'TABATA' &&
    (input.currentPhase === 'WORK' ||
      input.currentPhase === 'REST' ||
      input.currentPhase === 'COOLDOWN')
  ) {
    return {
      displayTime: formatDuration(input.timeRemaining, {
        unit: 'seconds',
        format: 'MM:SS',
      }),
      ...resolveTabataPhase(input.currentPhase, palette),
    }
  }
  // IDLE or default
  return {
    displayTime: formatDuration(0, { unit: 'seconds', format: 'MM:SS' }),
    phaseColor: palette.textSecondary,
    phaseLabel: 'READY',
  }
}

export const resolveWsDotColor = (
  connectionStatus: string,
  palette: TimerPhasePalette
): string =>
  connectionStatus === 'Connected'
    ? palette.successMain
    : connectionStatus === 'Reconnecting...'
      ? palette.warningDark
      : palette.errorMain

// Tabata intervals on one readable line. The mode is not named: the
// digits counting down or up already show it.
export const resolveTimerSummary = (input: {
  mode: TimerMode
  workDuration: number
  restDuration: number
}): string =>
  input.mode === 'TABATA'
    ? `WORK: ${input.workDuration}s · REST: ${input.restDuration}s`
    : ''

const getBeepServerSnapshot = () => DEFAULT_BEEP_PREFERENCE

// Beep-only volume. Overlaid in the card corner so it never takes space
// from the digits or changes the locked top-row height.
const TimerBeepVolume = ({ accentColor }: { accentColor: string }) => {
  const { volume, muted } = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getPreference,
    getBeepServerSnapshot
  )

  const handleVolumeChange = (_: Event, value: number | number[]) => {
    audioManager.setVolume(value as number)
  }

  return (
    <Box
      data-testid="timer-volume-control"
      sx={{
        position: 'absolute',
        top: 4,
        left: 8,
        // Above the running timer's tap-to-reveal layer.
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: 'common.white',
      }}
    >
      <IconButton
        onClick={() => audioManager.toggleMute()}
        aria-label={muted ? 'Unmute timer beeps' : 'Mute timer beeps'}
        aria-pressed={muted}
        data-testid="timer-volume-mute-button"
        sx={{ color: 'inherit', width: 44, height: 44 }}
      >
        {muted ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
      <Typography variant="caption" sx={{ fontWeight: 700, ml: -0.5 }}>
        Beeps
      </Typography>
      <Slider
        aria-label="Timer beep volume"
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        data-testid="timer-volume-slider"
        sx={{
          display: { xs: 'none', sm: 'inline-block' },
          width: 120,
          color: 'common.white',
          '& .MuiSlider-thumb': {
            color: accentColor,
            // 44px touch target around the small visible thumb.
            '&::before': {
              content: '""',
              position: 'absolute',
              width: 44,
              height: 44,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            },
          },
        }}
      />
    </Box>
  )
}

// While the timer runs the button stays hidden so the wall display shows
// only the digits; a tap on the card reveals Stop for this long.
const STOP_REVEAL_MS = 5000
const TOGGLE_WIDTH_PX = 112

const TimerToggleButton = () => {
  const control = useDashboardTimerControl()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (!revealed) return () => {}
    const timer = setTimeout(() => setRevealed(false), STOP_REVEAL_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  if (!control) return null
  const visible = !control.isRunning || revealed

  return (
    <>
      {control.isRunning && !revealed && (
        <Box
          data-testid="timer-reveal-area"
          onClick={() => setRevealed(true)}
          sx={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
      )}
      <Button
        data-testid="timer-toggle"
        variant="contained"
        size="large"
        color={control.isRunning ? 'error' : 'success'}
        disabled={!control.canControl}
        onClick={() => {
          control.toggle()
          setRevealed(false)
        }}
        sx={{
          // Phones stack it under the digits; wider cards dock it in the
          // top chrome row beside the status so it never covers the digits.
          position: { xs: 'static', sm: 'absolute' },
          display: 'flex',
          width: { xs: '100%', sm: TOGGLE_WIDTH_PX },
          mt: { xs: 1, sm: 0 },
          top: 5,
          right: 16,
          zIndex: 2,
          fontWeight: 800,
          letterSpacing: 1,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          '&:focus-visible': { opacity: 1 },
          // MUI's default disabled fill vanishes on the black card.
          '&.Mui-disabled': {
            backgroundColor: 'grey.800',
            color: 'grey.500',
          },
          transition: 'opacity 0.2s',
        }}
      >
        {control.isRunning ? 'Stop' : 'Start'}
      </Button>
    </>
  )
}

const TimerDisplay = () => {
  const hasToggle = useDashboardTimerControl() !== null
  const timerData = useTimerData()
  const { connectionStatus } = useWebSocketConnection()
  const theme = useTheme()
  const {
    currentPhase,
    timeRemaining,
    timeElapsed,
    mode,
    workDuration = 20,
    restDuration = 10,
  } = timerData

  // Phase colors resolve through the MUI theme so the timer shares the
  // single palette with the rest of the dashboard (no private hex values).
  const palette: TimerPhasePalette = {
    warningDark: theme.palette.warning.dark,
    infoMain: theme.palette.info.main,
    errorMain: theme.palette.error.main,
    successMain: theme.palette.success.main,
    textSecondary: theme.palette.text.secondary,
  }
  const { displayTime, phaseColor, phaseLabel } = resolveTimerPhaseVisual(
    { mode, currentPhase, timeRemaining, timeElapsed },
    palette
  )

  const wsDotColor = resolveWsDotColor(connectionStatus, palette)
  const timerSummary = resolveTimerSummary({
    mode,
    workDuration,
    restDuration,
  })

  return (
    <Card
      elevation={6}
      data-testid="timer-display-container"
      sx={{
        backgroundColor: theme.palette.common.black,
        color: phaseColor, // Dynamic color based on phase
        // Container queries let the digits scale with the timer's
        // horizontal width when the top row shrinks it to ~38% for 3 tiles.
        containerType: 'inline-size',
        // Ensure the card fills the grid cell height
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        // Responsive floor only. The canvas floor (20rem) rides the
        // canvas selector; inside the scaled canvas the top row is
        // locked at DASHBOARD_TOP_ROW_HEIGHT_MD and the card fills it,
        // so neither floor is active there regardless of breakpoint.
        minHeight: { xs: '8.5rem', sm: '10.5rem', md: '12.5rem' },
        [SCALED_CANVAS_SELECTOR]: { minHeight: '20rem' },
        display: 'flex',
        borderRadius: 2,
        border: `2px solid ${theme.palette.grey[900]}`,
        position: 'relative',
        overflow: 'hidden',
        animation:
          currentPhase === 'WORK' || currentPhase === 'REST'
            ? 'pulse-opacity 1.5s infinite'
            : 'none',
      }}
    >
      <TimerBeepVolume accentColor={phaseColor} />
      {/* Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: hasToggle ? { xs: 16, sm: 16 + TOGGLE_WIDTH_PX + 12 } : 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: theme.palette.common.white }}
          data-testid="ws-status-indicator"
        >
          {connectionStatus}
        </Typography>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: wsDotColor,
            animation:
              connectionStatus === 'Connected' ? 'pulse 2s infinite' : 'none',
          }}
        />
      </Box>
      <CardContent
        sx={{
          position: 'relative',
          width: '100%',
          // The sm value is the target-composition pin: scaled viewports
          // are always ≥ SCALE_TO_FIT_MIN_WIDTH, which tracks the sm
          // breakpoint, so the canvas never sees the xs value.
          // Phones clear the corner controls in flow; wider cards keep
          // them overlaid so the digits keep the full height.
          pt: { xs: '52px', sm: 1.5 },
          pb: { xs: 1, sm: 1.5 },
          px: 2,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0, // Prevent content from overflowing
        }}
      >
        {/* Phase and intervals share one row so the digits get the height */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'center',
            columnGap: 2,
          }}
        >
          {/* Phase Label - only show for Tabata phases, not RUNNING */}
          {currentPhase !== 'IDLE' && currentPhase !== 'RUNNING' && (
            <Typography
              data-testid="timer-phase"
              variant="h6"
              aria-live="polite"
              sx={{
                lineHeight: 1.2,
                color: phaseColor,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              {phaseLabel}
            </Typography>
          )}
          {timerSummary && (
            <Typography
              data-testid="timer-work-rest-badge"
              sx={{
                lineHeight: 1.2,
                color: 'common.white',
                fontWeight: 700,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                letterSpacing: 1,
              }}
            >
              {timerSummary}
            </Typography>
          )}
        </Box>

        {/* Giant Timer Display */}
        <Typography
          data-testid="timer-countdown"
          component="div"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            fontFamily: 'var(--font-digital-7), monospace',
            // Scale with the timer container width (cqw) so digits never
            // clip when the top row narrows; clamped to safe bounds.
            // The responsive cap fits the one-column phone layout; the
            // scaled canvas (full-width timer with no HR tiles) allows
            // the larger target-composition cap.
            fontSize: 'clamp(4rem, 34cqw, 15rem)',
            [SCALED_CANVAS_SELECTOR]: {
              fontSize: 'clamp(4rem, 34cqw, 17.5rem)',
            },
            fontWeight: 900,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            color: phaseColor,
            textShadow: `0 0 10px ${phaseColor}`,
            letterSpacing: '0.05em',
            transition: 'color 0.3s ease-in-out',
          }}
        >
          {displayTime}
        </Typography>
        <TimerToggleButton />
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)
