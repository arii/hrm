'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme, alpha } from '@mui/material/styles'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SpotifyCommand } from '@/types/websocket'
import {
  SPOTIFY_BRAND_COLOR,
  SPOTIFY_HOVER_COLOR,
  SPOTIFY_MSG_AWAITING_LOGIN,
  SPOTIFY_MSG_NO_TRACK,
  SPOTIFY_MSG_CONNECT_HRM,
  SPOTIFY_OFFLINE_WARNING,
  SPOTIFY_SEARCHING_DEVICES,
  EMPTY_DEVICES,
} from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import SpotifyTrackDisplay from '@/components/Spotify/SpotifyTrackDisplay'
import SpotifyDeviceSelector from '@/components/Spotify/SpotifyDeviceSelector'
import SpotifyVolumeControl from '@/components/Spotify/SpotifyVolumeControl'
import { useSpotifyDeviceSync } from '../hooks/useSpotifyDeviceSync'

const SpotifyControls = () => {
  const router = useRouter()
  const theme = useTheme()
  const { connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  // Use defensive destructuring to handle partial or empty data from the WebSocket.
  const devices = spotifyData?.devices || EMPTY_DEVICES
  const playback = spotifyData?.playback
  const track = playback?.track || { name: '', artist: '' }

  const { volume, setVolume, muted, toggleMute } = useVolumePreference()

  const [isSliding, setIsSliding] = useState(false)
  const lastSentVolumeRef = useRef<string | null>(null)

  const {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    resolveTargetDeviceId,
    markVolumeCommandSent,
    playback,
  } = useSpotifyDeviceSync(isSliding, volume, setVolume)

  const track = playback?.track || { name: '', artist: '' }

  const handleTrackSelect = (uri: string) => {
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: resolveTargetDeviceId(),
    })
  }

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasTrack = !!(
    track.name &&
    !['', SPOTIFY_MSG_AWAITING_LOGIN, SPOTIFY_MSG_NO_TRACK].includes(track.name)
  )

  const shouldShowControls =
    spotifyServiceInitialized && (hasTrack || devices.some((d) => d.is_active))

  useEffect(() => {
    const refresh = () =>
      connectionStatus === 'Connected' &&
      spotifyServiceInitialized &&
      sendData({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' })
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      const deviceId = resolveTargetDeviceId()
      if (['PLAY', 'PAUSE', 'NEXT', 'PREVIOUS'].includes(command)) {
        executeSpotify(command, { deviceId })
      }
    },
    [resolveTargetDeviceId, executeSpotify]
  )

  const handleVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId()
      if (!targetDeviceId) return

      const messageKey = `${targetDeviceId}:${value}`
      if (lastSentVolumeRef.current === messageKey) return

      markVolumeCommandSent()
      executeSpotify('SET_VOLUME', {
        volume: value,
        deviceId: targetDeviceId,
      })
      lastSentVolumeRef.current = messageKey
    },
    [
      connectionStatus,
      resolveTargetDeviceId,
      executeSpotify,
      markVolumeCommandSent,
    ]
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
        background: alpha(theme.palette.grey[900], 0.7),
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
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

        <SpotifySearchInput onTrackSelect={handleTrackSelect} />

        {shouldShowControls ? (
          <>
            <SpotifyTrackDisplay name={track.name} artist={track.artist} />
            <PlaybackControls
              isPlaying={playback?.is_playing ?? false}
              onCommand={handlePlaybackCommand}
              disabled={connectionStatus !== 'Connected'}
            />
            <SpotifyVolumeControl
              volume={volume}
              muted={muted}
              setVolume={setVolume}
              toggleMute={toggleMute}
              setIsSliding={setIsSliding}
              onVolumeCommand={handleVolumeCommand}
            />
            <SpotifyDeviceSelector
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={(id) => {
                setSelectedDeviceId(id)
                executeSpotify('TRANSFER_PLAYBACK', { deviceId: id })
              }}
              disabled={connectionStatus !== 'Connected'}
            />
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
                <CircularProgress
                  size={20}
                  color="inherit"
                  aria-label="Loading Spotify status"
                />
              ) : (
                <LibraryMusic />
              )
            }
            sx={{
              mt: 2,
              textTransform: 'none',
              py: 1.5,
              bgcolor: SPOTIFY_BRAND_COLOR,
              '&:hover': { bgcolor: SPOTIFY_HOVER_COLOR },
              '&.Mui-disabled': {
                bgcolor: alpha(SPOTIFY_BRAND_COLOR, 0.3),
                color: alpha(theme.palette.common.white, 0.5),
              },
            }}
          >
            {spotifyServiceInitialized && !devices.length
              ? SPOTIFY_SEARCHING_DEVICES
              : SPOTIFY_MSG_CONNECT_HRM}
          </Button>
        )}
      </CardContent>
    </ControlCard>
  )
}

export default SpotifyControls
