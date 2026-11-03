'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useSpotifyVolumeSync } from '@/hooks/useSpotifyVolumeSync'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useEffect, useReducer, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import AuthButton from './AuthButton'
import VolumeSlider from './shared/VolumeSlider'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'
import DeviceRecommendation from './Spotify/DeviceRecommendation'

// Shared across tabs and reloads: the SDK mints a new device id on every
// mount, so auto-transfer is rate-limited by time, not by id.
export const AUTO_TRANSFER_COOLDOWN_KEY = 'hrm-spotify-auto-transfer-at'
export const AUTO_TRANSFER_COOLDOWN_MS = 60_000

// Spotify's device list flaps SDK devices in and out poll-to-poll
// (backgrounded tabs), so latched server truth requires this many
// consecutive negative polls before flipping false.
export const STABLE_ACTIVE_POLLS = 3

// 1. State Shape (volume state lives in useSpotifyVolumeSync)
interface SpotifyDeviceState {
  selectedDeviceId: string
  deviceMenuAnchor: null | HTMLElement
}

// 2. Actions
type SpotifyDeviceAction =
  | { type: 'SELECT_DEVICE'; payload: string }
  | { type: 'OPEN_DEVICE_MENU'; payload: HTMLElement }
  | { type: 'CLOSE_DEVICE_MENU' }

// 3. Reducer Logic
const spotifyDeviceReducer = (
  state: SpotifyDeviceState,
  action: SpotifyDeviceAction
): SpotifyDeviceState => {
  switch (action.type) {
    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDeviceId: action.payload,
        deviceMenuAnchor: null,
      }
    case 'OPEN_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: action.payload }
    case 'CLOSE_DEVICE_MENU':
      return { ...state, deviceMenuAnchor: null }
    default:
      return state
  }
}

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  // Latched server truth: flips true on first sighting, requires
  // STABLE_ACTIVE_POLLS consecutive negatives to flip false.
  const [stable, setStable] = useState({
    active: false,
    hrmActive: false,
    listed: false,
  })
  const negActive = useRef(0)
  const negListed = useRef(0)
  const lastActiveName = useRef<string | null>(null)
  useEffect(() => {
    const devices = spotifyData.devices
    if (!devices) return
    const active = devices.find((device) => device.is_active) ?? null
    const listed = devices.some((device) => device.name === HRM_WEB_PLAYER_NAME)
    negActive.current = active ? 0 : negActive.current + 1
    negListed.current = listed ? 0 : negListed.current + 1
    if (active) lastActiveName.current = active.name
    const negA = negActive.current
    const negL = negListed.current
    const lastName = lastActiveName.current
    // Convergent: derived from poll arrivals, settles between polls.
    setStable((prev) => {
      const nextActive = !!active || (prev.active && negA < STABLE_ACTIVE_POLLS)
      return {
        active: nextActive,
        hrmActive: nextActive && lastName === HRM_WEB_PLAYER_NAME,
        listed: listed || (prev.listed && negL < STABLE_ACTIVE_POLLS),
      }
    })
  }, [spotifyData.devices])

  // 4. Device selection state (volume state lives in useSpotifyVolumeSync)
  const [deviceState, deviceDispatch] = useReducer(spotifyDeviceReducer, {
    selectedDeviceId: '',
    deviceMenuAnchor: null,
  })
  const { selectedDeviceId, deviceMenuAnchor } = deviceState

  const {
    displayVolume,
    isMuted,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
  } = useSpotifyVolumeSync({
    serverVolume: spotifyData.playback.volume_percent,
    serverMuted: spotifyData.playback.isMuted,
    connectionStatus,
    selectedDeviceId,
    devices: spotifyData.devices,
    executeSpotify,
  })

  const hasActiveDevice =
    !!selectedDeviceId ||
    spotifyData.devices?.some((device) => device.is_active)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useDashboardRegistration(player)

  // Effect to auto-select the active device
  useEffect(() => {
    const devices = spotifyData.devices || []
    if (devices.length === 0) {
      if (selectedDeviceId !== '') {
        deviceDispatch({ type: 'SELECT_DEVICE', payload: '' })
      }
      return
    }
    const activeDevice = devices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      deviceDispatch({ type: 'SELECT_DEVICE', payload: activeDevice.id })
      return
    }
    if (
      selectedDeviceId &&
      !devices.some((device) => device.id === selectedDeviceId)
    ) {
      deviceDispatch({ type: 'SELECT_DEVICE', payload: activeDevice?.id ?? '' })
    }
  }, [spotifyData.devices, selectedDeviceId])

  // Auto-connect: once the browser player is ready and the server device
  // list is known, silently select it when nothing else is active. Never
  // steals playback (skips when any device is active or anything is
  // playing) and never transfers blind on an empty list (waits for the
  // poll). Cooldown is shared across tabs and reloads via localStorage:
  // the SDK mints a new device id on every mount, so a per-id guard alone
  // refires (and flickers the status) on every reload.
  const [autoPending, setAutoPending] = useState(false)
  const autoPendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPlaying = spotifyData.playback?.is_playing ?? false
  useEffect(() => {
    if (!isReady || !deviceId) return
    if (connectionStatus !== 'Connected') return
    const lastFire = Number(
      localStorage.getItem(AUTO_TRANSFER_COOLDOWN_KEY) ?? 0
    )
    if (Date.now() - lastFire < AUTO_TRANSFER_COOLDOWN_MS) return
    const devices = spotifyData.devices
    if (!devices || devices.length === 0) return
    // Raw check covers mount (before the latch effect has run once);
    // the latched check covers poll-to-poll flaps.
    if (devices.some((device) => device.is_active)) return
    if (stable.active) return
    if (isPlaying) return
    localStorage.setItem(AUTO_TRANSFER_COOLDOWN_KEY, String(Date.now()))
    // Sync display state with the fired command; the cooldown above makes
    // this fire once, so it converges after one render, it cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoPending(true)
    executeSpotify('TRANSFER_PLAYBACK', { deviceId, play: false })
    if (autoPendingTimeout.current) clearTimeout(autoPendingTimeout.current)
    // If the server never confirms, fall back to the manual button.
    autoPendingTimeout.current = setTimeout(() => setAutoPending(false), 15000)
  }, [
    isReady,
    deviceId,
    connectionStatus,
    spotifyData.devices,
    stable.active,
    isPlaying,
    executeSpotify,
  ])

  // A device activating ends the auto-pending display.
  useEffect(() => {
    if (autoPending && spotifyData.devices?.some((d) => d.is_active)) {
      if (autoPendingTimeout.current) {
        clearTimeout(autoPendingTimeout.current)
        autoPendingTimeout.current = null
      }
      // One-shot transition keyed on external server state; convergent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoPending(false)
    }
  }, [autoPending, spotifyData.devices])

  useEffect(
    () => () => {
      if (autoPendingTimeout.current) clearTimeout(autoPendingTimeout.current)
    },
    []
  )

  const handlePlayPauseToggle = () => {
    if (spotifyData.playback.is_playing) {
      executeSpotify('PAUSE')
    } else {
      executeSpotify('PLAY')
    }
  }

  const handleDeviceSelect = (deviceId: string) => {
    deviceDispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    executeSpotify('TRANSFER_PLAYBACK', { deviceId })
  }

  if (!isLoggedIn) {
    return (
      <Box
        data-testid="spotify-auth-container"
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
          minHeight: '64px',
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

  if (isLoggedIn) {
    const isWaiting = spotifyData.playback.track.name === 'Awaiting Login...'
    const displayTrackName = isWaiting
      ? 'No Active Playback'
      : spotifyData.playback.track.name
    const displayArtist = isWaiting
      ? ''
      : `— ${spotifyData.playback.track.artist}`

    // Strict player-state display: exactly one status affordance at a time,
    // so the badge and the button can never contradict each other. Uses the
    // latched server truth (stable) so poll-to-poll list flaps never reach
    // the UI, and stays silent while anything plays rather than guessing.
    const sdkReady = isReady && !!deviceId
    const showActiveBadge = stable.hrmActive
    const showConnectingBadge =
      !stable.active &&
      !autoPending &&
      !isPlaying &&
      (!sdkReady || !stable.listed)
    const showAutoPending = !stable.active && autoPending && !isPlaying
    const showConnectButton =
      !stable.active && !isPlaying && sdkReady && stable.listed && !autoPending

    return (
      <Box
        data-testid="spotify-display-container"
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
          spotifyData.playback.is_playing ? 'Playing' : 'Paused'
        }${isReady ? ', Browser player ready' : ''}`}
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderRadius: 2,
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
          minHeight: '64px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'start',
            gap: 2,
            minHeight: '32px',
            minWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            data-testid="spotify-now-playing"
          >
            {displayTrackName} {displayArtist}
          </Typography>
          {showConnectingBadge && (
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'info.main',
                color: 'common.black',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              🔄 Connecting Player...
            </Typography>
          )}
          {showActiveBadge && (
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'success.main',
                color: 'common.black',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
          {showAutoPending && (
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'info.main',
                color: 'common.black',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Connecting…
            </Typography>
          )}
          {showConnectButton && <DeviceRecommendation />}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            justifySelf: 'center',
          }}
        >
          <IconButton
            size="small"
            onClick={() => executeSpotify('PREVIOUS')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Previous track"
            data-testid="spotify-previous-button"
          >
            <SkipPreviousIcon />
          </IconButton>
          <IconButton
            size="medium"
            onClick={handlePlayPauseToggle}
            sx={{
              color: 'common.white',
              backgroundColor: 'grey.700',
              '&:hover': { backgroundColor: 'grey.600' },
            }}
            aria-label={spotifyData.playback.is_playing ? 'Pause' : 'Play'}
            data-testid="spotify-play-pause-button"
          >
            {spotifyData.playback.is_playing ? (
              <PauseIcon />
            ) : (
              <PlayArrowIcon />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => executeSpotify('NEXT')}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Next track"
            data-testid="spotify-next-button"
          >
            <SkipNextIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'end',
            gap: 1,
          }}
        >
          <VolumeSlider
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onVolumeChangeCommitted={handleVolumeChangeCommitted}
            onToggleMute={handleToggleMute}
            showValue={true}
            disabled={!hasActiveDevice}
          />
          <SpotifyDeviceSelector
            availableDevices={spotifyData.devices || []}
            deviceMenuAnchor={deviceMenuAnchor}
            onDeviceSelect={handleDeviceSelect}
            onMenuOpen={(e) =>
              deviceDispatch({
                type: 'OPEN_DEVICE_MENU',
                payload: e.currentTarget,
              })
            }
            onMenuClose={() => deviceDispatch({ type: 'CLOSE_DEVICE_MENU' })}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleLogout}
            data-testid="spotify-logout-button"
            sx={{
              color: 'common.white',
              borderColor: 'grey.600',
              '&:hover': {
                borderColor: 'grey.500',
                backgroundColor: 'grey.800',
              },
              minWidth: 'auto',
              px: 1.5,
              fontSize: '0.75rem',
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>
    )
  }

  return null
}

export default SpotifyDisplay
