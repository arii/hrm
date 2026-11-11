// File: components/TimerDisplay.tsx
'use client'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeOff from '@mui/icons-material/VolumeOff'
import VolumeUp from '@mui/icons-material/VolumeUp'
import { memo, useEffect, useRef, useSyncExternalStore } from 'react'
import SideLabel from './SideLabel'
import { useIsScaledLayout } from '@/components/ScaledStage'
import { clampVolume } from '@/hooks/useVolumePreference'
import { formatDuration } from '@/lib/utils'
import { useTheme } from '@mui/material/styles'
import { audioManager } from '@/utils/audioManager'
import type { TimerMode, TimerPhase } from '@/types/core'

// Define a constant for the side column width to avoid magic numbers
const SIDE_COLUMN_WIDTH = '40px'

// Timer beep volume persistence. Separate keys from the Spotify music
// volume (useVolumePreference): beeps and music are independent outputs
// and must never move each other.
const TIMER_VOLUME_KEY = 'hrm-timer-volume'
const TIMER_MUTED_KEY = 'hrm-timer-muted'
const DEFAULT_BEEP_VOLUME = 70

// Persisted beep preference readers (SSR-safe: defaults on the server).
const readPreferredBeepVolume = (): number => {
  if (typeof window === 'undefined') return DEFAULT_BEEP_VOLUME
  try {
    const storedVol = window.localStorage.getItem(TIMER_VOLUME_KEY)
    const preferred =
      storedVol === null
        ? Math.round(audioManager.getVolume())
        : clampVolume(Number(storedVol))
    return preferred === 0 ? DEFAULT_BEEP_VOLUME : preferred
  } catch {
    return DEFAULT_BEEP_VOLUME
  }
}

const readBeepsMuted = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(TIMER_MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

// Persisted beep preference as an external store. useSyncExternalStore
// reads storage during render without hydrating mismatched: the server
// snapshot is the default, and the client snapshot matches it unless
// the user actually stored a preference. Same-tab writes notify
// manually ('storage' events only fire cross-tab).
interface BeepPreference {
  volume: number
  muted: boolean
}
const BEEP_DEFAULTS: BeepPreference = {
  volume: DEFAULT_BEEP_VOLUME,
  muted: false,
}
let beepSnapshot: BeepPreference = BEEP_DEFAULTS
const beepListeners = new Set<() => void>()
const readBeepSnapshot = (): BeepPreference => {
  const muted = readBeepsMuted()
  const preferred = readPreferredBeepVolume()
  return { volume: muted ? 0 : preferred, muted }
}
function subscribeBeepPreference(listener: () => void): () => void {
  beepListeners.add(listener)
  const onStorage = (): void => {
    beepSnapshot = readBeepSnapshot()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    beepListeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
function getBeepSnapshot(): BeepPreference {
  const fresh = readBeepSnapshot()
  if (
    fresh.volume !== beepSnapshot.volume ||
    fresh.muted !== beepSnapshot.muted
  ) {
    beepSnapshot = fresh
  }
  return beepSnapshot
}
function getBeepServerSnapshot(): BeepPreference {
  return BEEP_DEFAULTS
}
const persistBeepPreference = (preferred: number, muted: boolean): void => {
  try {
    window.localStorage.setItem(TIMER_VOLUME_KEY, String(preferred))
    window.localStorage.setItem(TIMER_MUTED_KEY, String(muted))
  } catch {
    // localStorage unavailable: volume still applies for this session.
  }
}
function writeBeepPreference(volume: number, muted: boolean): void {
  persistBeepPreference(volume, muted)
  beepSnapshot = { volume, muted }
  beepListeners.forEach((listener) => listener())
}

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

const TimerDisplay = () => {
  const timerData = useTimerData()
  const { connectionStatus } = useWebSocketConnection()
  const theme = useTheme()
  // Scaled mode pins the target-composition (md-breakpoint) sizes so
  // the canvas never reflips with the real window size.
  const isScaledLayout = useIsScaledLayout()
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

  // Timer beep volume: persisted store driving audioManager directly.
  // Deliberately not useVolumePreference — that hook's state is shared
  // with (and synced from) the Spotify music volume. useSyncExternalStore
  // (not render-time reads, not mount-effect hydration) so SSR and the
  // first client render agree. Ref init may read storage: refs never
  // render, so they cannot mismatch hydration.
  const beepPref = useSyncExternalStore(
    subscribeBeepPreference,
    getBeepSnapshot,
    getBeepServerSnapshot
  )
  const beepVolume = beepPref.volume
  const beepsMuted = beepPref.muted
  const lastBeepVolumeRef = useRef<number>(readPreferredBeepVolume())

  // audioManager is the live output: keep it in sync with React state.
  useEffect(() => {
    audioManager.setMuted(beepsMuted)
    audioManager.setVolume(beepVolume)
  }, [beepVolume, beepsMuted])

  const handleBeepVolumeChange = (_: Event, value: number | number[]) => {
    const next = clampVolume(value as number)
    if (next > 0) {
      lastBeepVolumeRef.current = next
    }
    // Persist the last nonzero volume (mute-restore memory), not the
    // possibly-zero slider position — same contract as before.
    writeBeepPreference(lastBeepVolumeRef.current, next === 0)
    audioManager.setVolume(next)
    audioManager.setMuted(next === 0)
  }

  const handleToggleBeepsMuted = () => {
    const muting = !beepsMuted
    if (muting && beepVolume > 0) {
      lastBeepVolumeRef.current = beepVolume
    }
    // The store snapshot (last nonzero volume + muted flag) drives the
    // slider directly — no separate restore step needed.
    writeBeepPreference(lastBeepVolumeRef.current, muting)
    audioManager.setMuted(muting)
  }

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
        minHeight: isScaledLayout
          ? '20rem'
          : { xs: '8.5rem', sm: '10.5rem', md: '12.5rem' },
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
      {/* Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
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
      {/* Left Column: Mode Indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: SIDE_COLUMN_WIDTH,
        }}
      >
        {currentPhase !== 'IDLE' && (
          <SideLabel
            text={mode === 'STOPWATCH' ? 'STOPWATCH' : 'TABATA'}
            ariaLabel={`Timer mode: ${mode}`}
            rotation="left"
          />
        )}
      </Box>
      {/* Right Column: Tabata Durations. Vertical rail keeps the
          durations out of the digits' vertical budget. */}
      <Box
        data-testid="timer-work-rest-badge"
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: SIDE_COLUMN_WIDTH,
        }}
      >
        {mode === 'TABATA' && (
          <SideLabel
            text={`WORK:${workDuration}s REST:${restDuration}s`}
            ariaLabel={`Work duration: ${workDuration} seconds, Rest duration: ${restDuration} seconds`}
            rotation="right"
          />
        )}
      </Box>
      <CardContent
        sx={{
          position: 'relative',
          width: '100%',
          py: isScaledLayout ? 1.5 : { xs: 1, md: 1.5 },
          px: SIDE_COLUMN_WIDTH,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 0, // Prevent content from overflowing
        }}
      >
        {/* Phase Label - only show for Tabata phases, not RUNNING */}
        {currentPhase !== 'IDLE' && currentPhase !== 'RUNNING' && (
          <Typography
            data-testid="timer-phase"
            variant="h6"
            aria-live="polite"
            sx={{
              mb: 0.5,
              color: phaseColor,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {phaseLabel}
          </Typography>
        )}

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
            fontSize: isScaledLayout
              ? 'clamp(4rem, 26cqw, 16rem)'
              : 'clamp(4rem, 26cqw, 13rem)',
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

        {/* Timer beep volume — independent of Spotify music volume.
            Compact by design: the top row is height-locked, so this row
            stays out of the digits' vertical budget. */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 0.5, width: '100%', maxWidth: 260 }}
        >
          <IconButton
            onClick={handleToggleBeepsMuted}
            aria-label={
              beepsMuted ? 'Unmute timer sounds' : 'Mute timer sounds'
            }
            data-testid="timer-volume-mute-button"
            sx={{ color: theme.palette.common.white }}
          >
            {beepsMuted || beepVolume === 0 ? <VolumeOff /> : <VolumeDown />}
          </IconButton>
          <Slider
            aria-label="Timer volume"
            value={beepsMuted ? 0 : beepVolume}
            onChange={handleBeepVolumeChange}
            data-testid="timer-volume-slider"
            sx={{
              color: theme.palette.common.white,
              '& .MuiSlider-thumb': {
                color: phaseColor,
              },
            }}
          />
          <VolumeUp sx={{ color: theme.palette.common.white }} />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default memo(TimerDisplay)
