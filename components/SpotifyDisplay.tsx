// components/SpotifyDisplay.tsx
'use client'
import { useSession, signIn } from 'next-auth/react'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import Box from '@mui/material/Box'
import { useCallback, useEffect, useState } from 'react'
import SpotifyAuthOverlay from './spotify/SpotifyAuthOverlay'
import SpotifyControls from './spotify/SpotifyControls'
import SpotifyDeviceSelector from './spotify/SpotifyDeviceSelector'
import SpotifyTrackInfo from './spotify/SpotifyTrackInfo'
import { useDebounce } from '@/hooks/useDebounce'
import Slider from '@mui/material/Slider'

const SpotifyDisplay = () => {
  const { data: session } = useSession()
  const { spotifyData, sendData } = useWebSocket()
  const { isAuthenticated } = useSpotifyWebPlayback()
  const [volume, setVolume] = useState(spotifyData.volume)
  const debouncedVolume = useDebounce(volume, 500)
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)

  useEffect(() => {
    const activeDevice = spotifyData.devices?.find((d) => d.is_active)
    if (activeDevice) {
      setSelectedDevice(activeDevice.id)
    }
  }, [spotifyData.devices])

  const sendSpotifyCommand = useCallback(
    (
      command: SpotifyCommandMessage['command'],
      payload?: Partial<SpotifyCommandMessage>
    ) => {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command,
        ...payload,
      })
    },
    [sendData]
  )

  useEffect(() => {
    sendSpotifyCommand('SET_VOLUME', { volume: debouncedVolume })
  }, [debouncedVolume, sendSpotifyCommand])

  const handleLogin = () => {
    signIn('spotify', {
      callbackUrl: '/',
      redirect: true,
    })
  }

  if (!session || !isAuthenticated) {
    return <SpotifyAuthOverlay onLogin={handleLogin} />
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'background.paper',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 3,
      }}
    >
      <SpotifyTrackInfo
        trackName={spotifyData.trackName}
        artist={spotifyData.artist}
        albumArtUrl={spotifyData.albumArtUrl}
      />
      <SpotifyControls
        isPlaying={spotifyData.isPlaying}
        onPlayPause={() =>
          sendSpotifyCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
        }
        onNext={() => sendSpotifyCommand('NEXT')}
        onPrevious={() => sendSpotifyCommand('PREVIOUS')}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Slider
          value={volume}
          onChange={(_, newValue) => setVolume(newValue as number)}
          min={0}
          max={100}
          sx={{ width: 150 }}
        />
        <SpotifyDeviceSelector
          devices={spotifyData.devices || []}
          selectedDevice={selectedDevice}
          onChange={(deviceId) => {
            setSelectedDevice(deviceId)
            sendSpotifyCommand('TRANSFER_PLAYBACK', { deviceId })
          }}
        />
      </Box>
    </Box>
  )
}

export default SpotifyDisplay
