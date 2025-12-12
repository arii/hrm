'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSession, signOut } from 'next-auth/react'
import { useWebSocket } from '@/context/WebSocketContext'
import SpeakerIcon from '@mui/icons-material/Speaker'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import SpotifyLoginButton from './SpotifyLoginButton'
import PlaybackControls from '@/components/Spotify/PlaybackControls'
import VolumeControl from '@/components/Spotify/VolumeControl'
import { useSpotifyControls } from '@/hooks/useSpotifyControls'


const SpotifyDisplay = () => {
  const { status } = useSession()
  const { spotifyData, connectionStatus } = useWebSocket()
  const isLoggedIn = status === 'authenticated'
  const { sendCommand } = useSpotifyControls()
  const { isPlaying, shuffleState, repeatState, devices = [] } = spotifyData;

  const [volume, setVolume] = useState(50);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )
  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  useEffect(() => {
    if (isLoggedIn && connectionStatus === 'Connected') {
      sendCommand('GET_DEVICES');
    }
  }, [isLoggedIn, connectionStatus, sendCommand]);


  useEffect(() => {
    const activeDevice = devices.find((device) => device.is_active)
    if (activeDevice) {
      if (activeDevice.id !== selectedDeviceId) {
        setSelectedDeviceId(activeDevice.id)
      }
      if(activeDevice.volume_percent && activeDevice.volume_percent !== volume) {
        setVolume(activeDevice.volume_percent)
      }
    }
  }, [devices, selectedDeviceId, volume])

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendCommand('TRANSFER_PLAYBACK', deviceId)
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
        <SpotifyLoginButton />
      </Box>
    )
  }

  if (isLoggedIn) {
    const isWaiting = spotifyData.trackName === 'Awaiting Login...'
    const displayTrackName = isWaiting
      ? 'No Active Playback'
      : spotifyData.trackName
    const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`

    return (
      <Box
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}`}
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayTrackName} {displayArtist}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaybackControls
                isPlaying={isPlaying}
                shuffleState={shuffleState}
                repeatState={repeatState}
                onCommand={sendCommand}
                disabled={connectionStatus !== 'Connected'}
            />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeControl
            volume={volume}
            onVolumeChange={setVolume}
            onVolumeChangeCommitted={(newVolume) => sendCommand('SET_VOLUME', newVolume)}
          />
          <IconButton
            size="small"
            onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
            sx={{
              color: 'common.white',
              '&:hover': { backgroundColor: 'grey.800' },
            }}
            aria-label="Select playback device"
          >
            <SpeakerIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={deviceMenuAnchor}
            open={deviceMenuOpen}
            onClose={() => setDeviceMenuAnchor(null)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
          >
            {devices.length > 0 ? (
              devices.map((device) => (
                <MenuItem
                  key={device.id}
                  onClick={() => handleDeviceSelect(device.id)}
                  selected={device.is_active}
                >
                  {device.name} {device.is_active && '✓'}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No devices available</MenuItem>
            )}
          </Menu>

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

  return null
}

export default SpotifyDisplay
