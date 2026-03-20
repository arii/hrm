import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import { useSpotifyOptimisticPlayback } from '@/hooks/useSpotifyOptimisticPlayback'
import { useSpotifyVolume } from '@/hooks/useSpotifyVolume'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import AuthButton from './AuthButton'
import VolumeSlider from './shared/VolumeSlider'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'
import DeviceRecommendation from './Spotify/DeviceRecommendation'
const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const theme = useTheme()

  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useDashboardRegistration(player)

  const { displayIsPlaying, handleCommand: handleOptimisticCommand } =
    useSpotifyOptimisticPlayback(spotifyData.playback.is_playing, (cmd) =>
      executeSpotify(cmd)
    )

  const {
    volume,
    muted,
    handleVolumeChange,
    handleVolumeCommit,
    handleToggleMute,
    hasActiveDevice,
  } = useSpotifyVolume(
    spotifyData.playback.volume_percent,
    spotifyData.playback.isMuted,
    selectedDeviceId,
    spotifyData.devices?.find((d) => d.is_active)?.id,
    (cmd, payload) => executeSpotify(cmd, payload)
  )

  // Effect to auto-select the active device
  useEffect(() => {
    const devices = spotifyData.devices || []
    if (devices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }
    const activeDevice = devices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      setSelectedDeviceId(activeDevice.id)
      return
    }
    if (
      selectedDeviceId &&
      !devices.some((device) => device.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(activeDevice?.id ?? '')
    }
  }, [spotifyData.devices, selectedDeviceId])

  const handlePlayPauseToggle = () => {
    handleOptimisticCommand(displayIsPlaying ? 'PAUSE' : 'PLAY')
  }

  const handleDeviceSelect = (id: string) => {
    setSelectedDeviceId(id)
    setDeviceMenuAnchor(null)
    executeSpotify('TRANSFER_PLAYBACK', { deviceId: id })
  }

  const handleOpenDeviceMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDeviceMenuAnchor(event.currentTarget)
  }

  const handleCloseDeviceMenu = () => {
    setDeviceMenuAnchor(null)
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
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
            data-testid="spotify-now-playing"
          >
            {displayTrackName} {displayArtist}
          </Typography>
          {!isReady && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'info.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
              }}
            >
              🔄 Connecting Player...
            </Typography>
          )}
          {isReady && deviceId && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'success.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
          <DeviceRecommendation />
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
            aria-label={displayIsPlaying ? 'Pause' : 'Play'}
            data-testid="spotify-play-pause-button"
          >
            {displayIsPlaying ? <PauseIcon /> : <PlayArrowIcon />}
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
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
            onVolumeChangeCommitted={handleVolumeCommit}
            onToggleMute={handleToggleMute}
            showValue
            sliderColor={theme.palette.secondary.main}
            disabled={!hasActiveDevice}
          />
          <SpotifyDeviceSelector
            availableDevices={spotifyData.devices || []}
            deviceMenuAnchor={deviceMenuAnchor}
            onDeviceSelect={handleDeviceSelect}
            onMenuOpen={(e) =>
              dispatch({ type: 'OPEN_DEVICE_MENU', payload: e.currentTarget })
            }
            onMenuClose={() => dispatch({ type: 'CLOSE_DEVICE_MENU' })}
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
