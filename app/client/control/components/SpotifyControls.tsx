// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SpotifyCommand } from '@/types/websocket'
import { SpotifyDevice } from '@/types/core'
import {
  HRM_WEB_PLAYER_NAME,
  VOLUME_SYNC_GRACE_PERIOD_MS,
  SPOTIFY_BRAND_COLOR,
  SPOTIFY_AWAITING_LOGIN,
  SPOTIFY_NO_TRACK_PLAYING,
  SPOTIFY_CONNECT_CTA,
  SPOTIFY_SEARCHING_DEVICES,
  SPOTIFY_OFFLINE_WARNING,
  SPOTIFY_HOVER_COLOR,
} from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import VolumeSlider from '@/components/shared/VolumeSlider'

const EMPTY_DEVICES: SpotifyDevice[] = []

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  const devices = spotifyData?.devices || EMPTY_DEVICES
  const playback = spotifyData?.playback
  const track = playback?.track || { name: '', artist: '' }

  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const { showWarning } = useAppSnackbar()
  const lastSentVolumeRef = useRef<string | null>(null)
  const lastWarningTimeRef = useRef<number>(0)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isSliding, setIsSliding] = useState(false)
  const prevActiveIdRef = useRef<string | undefined>(undefined)
  const lastVolumeSyncTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d: SpotifyDevice) =>
          d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  const handleTrackSelect = (uri: string) => {
    const targetDeviceId = resolveTargetDeviceId()
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: targetDeviceId,
    })
  }

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasTrack = !!(
    track.name &&
    !['', SPOTIFY_AWAITING_LOGIN, SPOTIFY_NO_TRACK_PLAYING].includes(track.name)
  )
  const shouldShowControls =
    spotifyServiceInitialized &&
    (hasTrack || devices.some((d: SpotifyDevice) => d.is_active))

  const refresh = useCallback(
    () =>
      connectionStatus === 'Connected' &&
      spotifyServiceInitialized &&
      sendData({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' }),
    [connectionStatus, spotifyServiceInitialized, sendData]
  )

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  useEffect(() => {
    const activeDevice = devices.find((d: SpotifyDevice) => d.is_active)
    const activeId = activeDevice?.id

    // Helper: determine if device should be updated to activeId
    const shouldUpdateToActive = () => {
      // Initial sync or active device changed externally
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }
      // Selected device no longer exists or no device selected
      const selectedStillExists = devices.some(
        (d: SpotifyDevice) => d.id === selectedDeviceId
      )
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      setSelectedDeviceId(activeId!)
    }
    prevActiveIdRef.current = activeId

    // Sync Volume (if not dragging and not within grace period after send)
    // We rely on the server as the source of truth for volume, but use a grace period
    // to prevent local sliders from "jumping" while the user is actively adjusting them.
    const playbackVolume = playback?.volume_percent

    if (isSliding) return

    const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current

    // Only sync if we haven't sent a volume command recently.
    // The server broadcasts a SPOTIFY_UPDATE immediately after a SET_VOLUME command,
    // confirming the new state to all clients.
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (shouldRespectGracePeriod) {
      return
    }

    // Clear pending flag after grace period
    if (
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    if (activeDevice && typeof playbackVolume === 'number') {
      if (playbackVolume !== volume) {
        setVolume(playbackVolume)
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]) // Rely on devices update to trigger sync

  // Auto-select HRM Web Player if no active device is available
  useEffect(() => {
    if (
      devices.length > 0 &&
      !selectedDeviceId &&
      !devices.some((d: SpotifyDevice) => d.is_active) &&
      hrmDevice
    ) {
      setSelectedDeviceId(hrmDevice.id)
    }
  }, [devices, selectedDeviceId, hrmDevice])

  const resolveTargetDeviceId = useCallback(() => {
    return (
      selectedDeviceId ||
      devices.find((device: SpotifyDevice) => device.is_active)?.id ||
      hrmDevice?.id
    )
  }, [devices, selectedDeviceId, hrmDevice])

  const sendSpotifyCommand = useCallback(
    (
      command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
      overriddenDeviceId?: string
    ) => {
      const deviceId =
        overriddenDeviceId !== undefined
          ? overriddenDeviceId
          : resolveTargetDeviceId()

      switch (command) {
        case 'PLAY':
          executeSpotify('PLAY', { deviceId })
          break
        case 'PAUSE':
          executeSpotify('PAUSE', { deviceId })
          break
        case 'NEXT':
          executeSpotify('NEXT', { deviceId })
          break
        case 'PREVIOUS':
          executeSpotify('PREVIOUS', { deviceId })
          break
        case 'TRANSFER_PLAYBACK':
          if (deviceId) {
            executeSpotify('TRANSFER_PLAYBACK', { deviceId })
          }
          break
      }
    },
    [resolveTargetDeviceId, executeSpotify]
  )

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        sendSpotifyCommand(command)
      }
    },
    [sendSpotifyCommand]
  )

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        // Throttle warning to once every 3 seconds to avoid spam during sliding
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning(SPOTIFY_OFFLINE_WARNING)
          lastWarningTimeRef.current = now
        }
      }
    },
    [connectionStatus, showWarning, setVolume]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId()

      // Prevent sending volume command if no device is targeted
      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      hasPendingSendRef.current = true
      lastVolumeSyncTimeRef.current = Date.now()

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })

      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolveTargetDeviceId, executeSpotify]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      setIsSliding(false)
      sendVolumeCommand(val)
    },
    [sendVolumeCommand]
  )

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  return (
    <ControlCard
      data-testid="spotify-controls"
      sx={{
        mb: 3,
        color: 'white',
        background: 'rgba(30, 41, 59, 0.7)',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            color: SPOTIFY_BRAND_COLOR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicNote sx={{ mr: 1 }} /> Spotify
        </Typography>

        <Box sx={{ mb: 2 }}>
          <SpotifySearchInput onTrackSelect={handleTrackSelect} />
        </Box>

        {shouldShowControls ? (
          <>
            <Box
              sx={{
                textAlign: 'center',
                mb: 2,
                minHeight: '4rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 'medium', lineHeight: 1.2 }}
              >
                {track.name}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'grey.400', lineHeight: 1.2 }}
              >
                {track.artist}
              </Typography>
            </Box>
            <PlaybackControls
              isPlaying={playback?.is_playing ?? false}
              onCommand={handlePlaybackCommand}
              disabled={connectionStatus !== 'Connected'}
            />
            <VolumeSlider
              volume={volume}
              muted={muted}
              onVolumeChange={handleVolumeChange}
              onVolumeChangeCommitted={handleVolumeChangeCommitted}
              onToggleMute={toggleMute}
              showValue
            />
            {devices.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const id = e.target.value as string
                      setSelectedDeviceId(id)
                      if (id) sendSpotifyCommand('TRANSFER_PLAYBACK', id)
                    }}
                    disabled={connectionStatus !== 'Connected'}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.600',
                      },
                      '& .MuiSvgIcon-root': { color: 'white' },
                    }}
                    data-testid="spotify-device-select"
                  >
                    {devices.map((d: SpotifyDevice) => (
                      <MenuItem
                        key={d.id}
                        value={d.id}
                        data-testid={`spotify-device-select-option-${d.id}`}
                      >
                        {d.name} {d.is_active && '(Active)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryMusic />}
              onClick={handleBrowseClick}
              sx={{
                mt: 2,
                borderColor: 'grey.600',
                color: 'grey.300',
                textTransform: 'none',
              }}
              data-testid="spotify-select-playlist-button"
            >
              Select Playlist
            </Button>
          </>
        ) : (
          <Button
            onClick={handleBrowseClick}
            data-testid="spotify-select-music-button"
            fullWidth
            variant="contained"
            disabled={spotifyServiceInitialized && !devices.length}
            startIcon={
              spotifyServiceInitialized && !devices.length ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <LibraryMusic />
              )
            }
            sx={{
              textTransform: 'none',
              py: 1.5,
              bgcolor: SPOTIFY_BRAND_COLOR,
              '&:hover': { bgcolor: SPOTIFY_HOVER_COLOR },
              '&.Mui-disabled': {
                bgcolor: 'rgba(29, 185, 84, 0.3)',
                color: 'rgba(255, 255, 255, 0.5)',
              },
            }}
          >
            {spotifyServiceInitialized && !devices.length
              ? SPOTIFY_SEARCHING_DEVICES
              : SPOTIFY_CONNECT_CTA}
          </Button>
        )}
      </CardContent>
    </ControlCard>
  )
}

export default SpotifyControls
