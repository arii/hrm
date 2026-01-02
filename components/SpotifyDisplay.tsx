'use client'
import { useError } from '@/context/ErrorContext'
import { useSession, signOut } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { useWebSocket } from '@/context/WebSocketContext'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import AuthButton from './AuthButton'
import VolumeSlider from './Spotify/VolumeSlider'
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper'
import useSpotifyControls from '@/hooks/useSpotifyControls'

const SpotifyDisplay = () => {
  const { data: session, status } = useSession()
  const { addError } = useError()
  const { spotifyData } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )
  const {
    setSelectedDeviceId,
    volume,
    setVolume,
    muted,
    toggleMute,
    sendSpotifyCommand,
  } = useSpotifyControls()

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      addError('Spotify session expired. Please log in again.', 'persistent')
      signOut()
    }
  }, [session, addError])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()
  useSpotifyRemoteExecution(player)

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
    setDeviceMenuAnchor(null)
  }

  if (!isLoggedIn) {
    return (
      <Box
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
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

  const isWaiting = spotifyData.trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting
    ? 'No Active Playback'
    : spotifyData.trackName
  const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`

  return (
    <Box
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        spotifyData.isPlaying ? 'Playing' : 'Paused'
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
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'start',
          gap: 2,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {displayTrackName} {displayArtist}
        </Typography>
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
            }}
          >
            🎵 Browser Player Active
          </Typography>
        )}
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
          onClick={() => sendSpotifyCommand('PREVIOUS')}
          sx={{
            color: 'common.white',
            '&:hover': { backgroundColor: 'grey.800' },
          }}
          aria-label="Previous track"
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
          aria-label={spotifyData.isPlaying ? 'Pause' : 'Play'}
        >
          {spotifyData.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => sendSpotifyCommand('NEXT')}
          sx={{
            color: 'common.white',
            '&:hover': { backgroundColor: 'grey.800' },
          }}
          aria-label="Next track"
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
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
        />
        <SpotifyDeviceSelectorWrapper
          availableDevices={spotifyData.devices || []}
          deviceMenuAnchor={deviceMenuAnchor}
          onDeviceSelect={handleDeviceSelect}
          onMenuOpen={(e) => setDeviceMenuAnchor(e.currentTarget)}
          onMenuClose={() => setDeviceMenuAnchor(null)}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
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

export default SpotifyDisplay
