'use client'
import MusicNote from '@mui/icons-material/MusicNote'
import LibraryMusic from '@mui/icons-material/LibraryMusic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ControlCard from '@/components/shared/ControlCard'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { HRM_WEB_PLAYER_NAME } from '@/constants/spotify'
import PlaybackControls from '@/components/shared/PlaybackControls'
import SpotifySearchInput from '@/components/SpotifySearchInput'

import SpotifyTrackDisplay from './spotify/SpotifyTrackDisplay'
import SpotifyVolumeControl from './spotify/SpotifyVolumeControl'
import SpotifyDeviceSelector from './spotify/SpotifyDeviceSelector'
import { useSpotifyDeviceSync } from '../hooks/useSpotifyDeviceSync'

const SpotifyControls = () => {
  const router = useRouter()
  const { spotifyData, connectionStatus, sendData, spotifyServiceInitialized } =
    useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { devices = [] } = spotifyData

  const hrmDevice = useMemo(
    () =>
      devices.find(
        (d) => d.name?.toLowerCase() === HRM_WEB_PLAYER_NAME.toLowerCase()
      ),
    [devices]
  )

  const { selectedDeviceId, setSelectedDeviceId } = useSpotifyDeviceSync(
    devices,
    hrmDevice
  )

  const handleTrackSelect = (uri: string) => {
    executeSpotify('PLAY', {
      uri: uri,
      deviceId: selectedDeviceId,
    })
  }

  const handleBrowseClick = () => {
    router.push('/client/spotify-selection')
  }

  const hasSpotifyData =
    spotifyData.playback.track.name !== 'Awaiting Login...' &&
    spotifyData.playback.track.name !== '' &&
    spotifyData.playback.track.name !== 'No Track Playing'

  useEffect(() => {
    if (connectionStatus === 'Connected' && spotifyServiceInitialized) {
      sendData({
        type: 'SPOTIFY_COMMAND',
        command: 'GET_DEVICES',
      })
    }
  }, [connectionStatus, sendData, spotifyServiceInitialized])

  const sendSpotifyCommand = useCallback(
    (
      command:
        | 'PLAY'
        | 'PAUSE'
        | 'NEXT'
        | 'PREVIOUS'
        | 'TRANSFER_PLAYBACK'
        | 'SET_VOLUME',
      params?: { deviceId?: string; volume?: number }
    ) => {
      const deviceId = params?.deviceId || selectedDeviceId

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
        case 'SET_VOLUME':
          if (deviceId && typeof params?.volume === 'number') {
            executeSpotify('SET_VOLUME', {
              volume: params.volume,
              deviceId,
            })
          }
          break
      }
    },
    [selectedDeviceId, executeSpotify]
  )

  const activeDevice = devices.find((d) => d.is_active)

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

        {hasSpotifyData ? (
          <>
            <SpotifyTrackDisplay
              trackName={spotifyData.playback.track.name}
              artistName={spotifyData.playback.track.artist}
            />

            <PlaybackControls
              isPlaying={spotifyData.playback.is_playing}
              onCommand={(command) =>
                sendSpotifyCommand(
                  command as 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS'
                )
              }
              disabled={connectionStatus !== 'Connected'}
            />

            <SpotifyVolumeControl
              playbackVolume={
                activeDevice ? spotifyData.playback.volume_percent : undefined
              }
              isConnected={connectionStatus === 'Connected'}
              onVolumeChangeCommitted={(volume) =>
                sendSpotifyCommand('SET_VOLUME', { volume })
              }
            />

            <SpotifyDeviceSelector
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onDeviceChange={(deviceId) => {
                setSelectedDeviceId(deviceId)
                if (deviceId) {
                  sendSpotifyCommand('TRANSFER_PLAYBACK', { deviceId })
                }
              }}
              disabled={connectionStatus !== 'Connected'}
            />

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
