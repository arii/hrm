'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import { SpotifyDevice } from '@/types/index'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Atomic Components
import VolumeControl from './Spotify/VolumeControl'
import DeviceSelector from './Spotify/DeviceSelector'
import PlayerControls from './Spotify/PlayerControls'

const SpotifyDisplay = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { data: session } = useSession()
  const { volume, setVolume } = useVolumePreference(70)
  const lastSentVolumeRef = useRef<string | null>(null)
  const {
    player,
    isReady,
    deviceId,
    error: webPlaybackError,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [availableDevices, setAvailableDevices] = useState<SpotifyDevice[]>([])

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId =
        selectedDeviceId ||
        availableDevices.find((device) => device.is_active)?.id

      // Prevent sending volume command if no device is targeted
      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
        deviceId: targetDeviceId,
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [availableDevices, connectionStatus, selectedDeviceId, sendData]
  )

  useEffect(() => {
    sendVolumeCommand(volume)
  }, [volume, sendVolumeCommand])

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  useEffect(() => {
    if (!player || typeof player.setVolume !== 'function') return
    const scalar = Math.min(Math.max(volume / 100, 0), 1)
    player
      .setVolume(scalar)
      .catch((err) =>
        console.warn('[Dashboard] Failed to adjust local Spotify volume:', err)
      )
  }, [player, volume])

  const spotifyLoggedIn =
    Boolean(session?.accessToken) && Boolean(spotifyAuthenticated)

  useEffect(() => {
    if (spotifyLoggedIn && spotifyData.trackName) {
      const fetchDevices = async () => {
        try {
          const response = await fetch('/api/spotify/devices')
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const devices = await response.json()
          const deviceArray = Array.isArray(devices) ? devices : []
          setAvailableDevices(deviceArray)
        } catch (error) {
          console.error('[Dashboard] Failed to fetch Spotify devices:', error)
        }
      }
      fetchDevices()
    } else {
      setAvailableDevices([])
      setSelectedDeviceId('')
    }
  }, [spotifyLoggedIn, spotifyData.trackName, isReady])

  useEffect(() => {
    if (availableDevices.length === 0) {
      if (selectedDeviceId !== '') {
        setSelectedDeviceId('')
      }
      return
    }
    const activeDevice = availableDevices.find((device) => device.is_active)
    if (!selectedDeviceId && activeDevice) {
      setSelectedDeviceId(activeDevice.id)
      return
    }
    if (
      selectedDeviceId &&
      !availableDevices.some((device) => device.id === selectedDeviceId)
    ) {
      setSelectedDeviceId(activeDevice?.id ?? '')
    }
  }, [availableDevices, selectedDeviceId])

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK',
    targetDeviceId?: string
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...(targetDeviceId && { deviceId: targetDeviceId }),
    }
    sendData(message)
  }

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendSpotifyCommand(command)
  }

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    sendSpotifyCommand('TRANSFER_PLAYBACK', deviceId)
  }

  const handleSpotifyLogin = () => {
    signIn('spotify', { callbackUrl: '/' })
  }

  const handleSpotifyLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (!spotifyLoggedIn) {
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
          mb: 0,
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={handleSpotifyLogin}
          sx={{ px: 4, py: 1 }}
          data-testid="login-button"
        >
          🎵 Login with Spotify
        </Button>
      </Box>
    )
  }

  // If we are logged in, we show the player bar.
  // We handle the specific "Awaiting Login..." text by replacing it with "No Active Playback"
  // or simply showing the controls so the user can transfer playback.
  if (spotifyLoggedIn) {
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
          mb: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {displayTrackName} {displayArtist}
          </Typography>
          {spotifyAuthenticated && !isReady && !webPlaybackError && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'info.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
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
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
          {webPlaybackError && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.9,
                backgroundColor: 'error.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              ⚠️ Player Error
            </Typography>
          )}
        </Box>

        <PlayerControls
          isPlaying={spotifyData.isPlaying}
          onPlayPause={handlePlayPauseToggle}
          onNext={() => sendSpotifyCommand('NEXT')}
          onPrev={() => sendSpotifyCommand('PREVIOUS')}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeControl
            volume={volume}
            onVolumeChange={setVolume}
            onVolumeChangeCommitted={sendVolumeCommand}
            width={80}
            showValue={false}
          />

          <DeviceSelector
            devices={availableDevices}
            selectedDeviceId={selectedDeviceId}
            onDeviceSelect={handleDeviceSelect}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={handleSpotifyLogout}
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
