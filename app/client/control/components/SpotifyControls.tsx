// File: app/client/control/components/SpotifyControls.tsx
'use client'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Button from '@mui/material/Button'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import PlaybackControls from '@/components/shared/PlaybackControls'
import VolumeSlider from '@/components/shared/VolumeSlider'
import { SPOTIFY_BRAND_COLOR } from '@/constants/spotify'
import SpotifyControlsHeader from './SpotifyControlsHeader'
import SpotifyTrackDisplay from './SpotifyTrackDisplay'
import SpotifyDeviceDropdown from './SpotifyDeviceDropdown'
import { useSpotifyControlDevice } from './useSpotifyControlDevice'
import { useSpotifyControlVolume } from './useSpotifyControlVolume'
import { useSpotifyControlCommands } from './useSpotifyControlCommands'
import { useOptimisticPlayPause } from './useOptimisticPlayPause'

const SpotifyControls = () => {
  const { spotifyData, connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { devices = [] } = spotifyData // Default to empty array if undefined
  const { showWarning } = useAppSnackbar()

  const { selectedDeviceId, selectDevice, resolveTargetDeviceId } =
    useSpotifyControlDevice({
      devices,
      connectionStatus,
      spotifyServiceInitialized,
      sendData,
    })

  const {
    volume,
    muted,
    toggleMute,
    handleVolumeChange,
    handleVolumeChangeCommitted,
  } = useSpotifyControlVolume({
    devices,
    playbackVolume: spotifyData.playback.volume_percent,
    connectionStatus,
    showWarning,
    resolveTargetDeviceId,
    executeSpotify,
  })

  const {
    sendSpotifyCommand,
    handleTrackSelect,
    handleBrowseClick,
    handleDeviceSelect,
  } = useSpotifyControlCommands({
    resolveTargetDeviceId,
    executeSpotify,
    selectDevice,
  })

  const { displayPlaying, handlePlaybackCommand } = useOptimisticPlayPause({
    sendCommand: sendSpotifyCommand,
    serverIsPlaying: spotifyData.playback.is_playing,
  })

  const hasSpotifyData =
    spotifyData.playback.track.name !== 'Awaiting Login...' &&
    spotifyData.playback.track.name !== '' &&
    spotifyData.playback.track.name !== 'No Track Playing'

  // Device picker is independent of playback: it must stay available while
  // idle so a target can be chosen before anything plays (dashboard parity).
  const devicePicker =
    devices.length > 0 ? (
      <SpotifyDeviceDropdown
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        disabled={connectionStatus !== 'Connected'}
        onSelect={handleDeviceSelect}
      />
    ) : null

  return (
    <ControlCard
      data-testid="spotify-controls"
      sx={{
        mb: 3,
        color: 'common.white',
        // Deliberate translucent slate (no palette equivalent); not a token gap.
        background: 'rgba(30, 41, 59, 0.7)',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <SpotifyControlsHeader onTrackSelect={handleTrackSelect} />

        {hasSpotifyData ? (
          <>
            <SpotifyTrackDisplay
              name={spotifyData.playback.track.name}
              artist={spotifyData.playback.track.artist}
            />

            <PlaybackControls
              isPlaying={displayPlaying}
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
              sliderColor={SPOTIFY_BRAND_COLOR}
              size="medium"
              sx={{ mt: 3, mb: 1 }}
            />

            {devicePicker}
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
          <>
            {devicePicker}
            <Button
              onClick={handleBrowseClick}
              data-testid="spotify-select-music-button"
            >
              Select Music
            </Button>
          </>
        )}
      </CardContent>
    </ControlCard>
  )
}

export default SpotifyControls
