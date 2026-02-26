// File: app/client/control/components/SpotifyControls.tsx
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
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { SpotifyCommand } from '@/types/websocket'
import {
  SPOTIFY_BRAND_COLOR,
  SPOTIFY_AWAITING_LOGIN,
  SPOTIFY_NO_TRACK_PLAYING,
  SPOTIFY_CONNECT_CTA,
  SPOTIFY_SEARCHING_DEVICES,
  SPOTIFY_HOVER_COLOR,
} from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import SpotifyTrackDisplay from '@/components/Spotify/SpotifyTrackDisplay'
import SpotifyDeviceSelector from '@/components/Spotify/SpotifyDeviceSelector'
import SpotifyVolumeControl from '@/components/Spotify/SpotifyVolumeControl'
import { useSpotifyDeviceSync } from '../hooks/useSpotifyDeviceSync'

const SpotifyControls = () => {
  const router = useRouter()
  const { connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
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
    !['', SPOTIFY_AWAITING_LOGIN, SPOTIFY_NO_TRACK_PLAYING].includes(track.name)
  )

  const shouldShowControls =
    spotifyServiceInitialized && (hasTrack || devices.some((d) => d.is_active))

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
