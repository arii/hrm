// File: app/client/control/components/SpotifyControls.tsx
'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useSpotifyVolume } from '@/hooks/useSpotifyVolume'
import { useSpotifyDeviceSync } from '@/hooks/useSpotifyDeviceSync'
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback'
import { SpotifyCommand } from '@/types/websocket'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'
import VolumeSlider from '@/components/shared/VolumeSlider'

const SpotifyControls = () => {
  const router = useRouter()
  const { connectionStatus, sendData, spotifyServiceInitialized, spotifyData } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { track, isPlaying, hasTrack, volumePercent } = useSpotifyPlayback()
  const devices = spotifyData.devices || []
  const { setVolume, muted, toggleMute } = useVolumePreference()
  const { showWarning } = useAppSnackbar()
  const lastWarningTimeRef = useRef<number>(0)

  const {
    selectedDeviceId,
    handleDeviceSelect,
    resolveTargetDeviceId,
    hasActiveDevice,
  } = useSpotifyDeviceSync({
    devices,
    onTransferPlayback: (deviceId) =>
      executeSpotify('TRANSFER_PLAYBACK', { deviceId }),
  })

  const handleTrackSelect = (uri: string) => {
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: resolveTargetDeviceId(),
    })
  }

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  useEffect(() => {
    if (connectionStatus === 'Connected' && spotifyServiceInitialized) {
      sendData({ type: 'SPOTIFY_COMMAND', command: 'GET_DEVICES' })
    }
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  const {
    volume: spotifyVolume,
    handleVolumeChange: internalHandleVolumeChange,
    handleVolumeChangeCommitted,
  } = useSpotifyVolume({
    serverVolume: volumePercent,
    targetDeviceId: resolveTargetDeviceId(),
    onLocalVolumeChange: setVolume,
  })

  const handleVolumeChange = useCallback(
    (val: number) => {
      internalHandleVolumeChange(val)

      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning('Changes not saved: Offline')
          lastWarningTimeRef.current = now
        }
      }
    },
    [connectionStatus, internalHandleVolumeChange, showWarning]
  )

  const handlePlaybackCommand = useCallback(
    (command: SpotifyCommand) => {
      if (
        command === 'PLAY' ||
        command === 'PAUSE' ||
        command === 'NEXT' ||
        command === 'PREVIOUS'
      ) {
        executeSpotify(command)
      }
    },
    [executeSpotify]
  )

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
            color: '#1DB954',
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

        {hasTrack ? (
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
              <>
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
              </>
            </Box>

            <PlaybackControls
              isPlaying={isPlaying}
              onCommand={handlePlaybackCommand}
              disabled={connectionStatus !== 'Connected'}
            />

            <VolumeSlider
              volume={spotifyVolume}
              muted={muted}
              onVolumeChange={handleVolumeChange}
              onVolumeChangeCommitted={handleVolumeChangeCommitted}
              onToggleMute={toggleMute}
              showValue={true}
              disabled={!hasActiveDevice}
            />

            {devices.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
                  Device
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedDeviceId}
                    onChange={(e) => handleDeviceSelect(e.target.value)}
                    disabled={connectionStatus !== 'Connected'}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'grey.600',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                    }}
                    data-testid="spotify-device-select"
                  >
                    {devices.map((device) => (
                      <MenuItem
                        key={device.id}
                        value={device.id}
                        data-testid={`spotify-device-select-option-${device.id}`}
                      >
                        {device.name} {device.is_active && '(Active)'}
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
              sx={{ mt: 2, borderColor: 'grey.600', color: 'grey.300' }}
              data-testid="spotify-select-playlist-button"
            >
              Select Playlist
            </Button>
          </>
        ) : (
          <Button
            onClick={handleBrowseClick}
            data-testid="spotify-select-music-button"
          >
            Select Music
          </Button>
        )}
      </CardContent>
    </ControlCard>
  )
}

export default SpotifyControls
