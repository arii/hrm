// components/Spotify/SpotifyControls.tsx
import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
import ProgressBar from './ProgressBar'
import PlaybackControls from './PlaybackControls'
import useVolumePreference from '@/hooks/useVolumePreference'

const SpotifyControls: React.FC = () => {
  const { spotifyData, sendData } = useWebSocket()
  const { volume, setVolume } = useVolumePreference()

  const handleSeek = (positionMs: number) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'SEEK_TO_POSITION',
      positionMs,
    }
    sendData(message)
  }

  const handlePlayPause = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY'
    sendData({ type: 'SPOTIFY_COMMAND', command } as SpotifyCommandMessage)
  }

  const handleNext = () => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'NEXT',
    } as SpotifyCommandMessage)
  }

  const handlePrevious = () => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'PREVIOUS',
    } as SpotifyCommandMessage)
  }

  const handleToggleShuffle = () => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_SHUFFLE',
      shuffleState: !spotifyData.shuffleState,
    } as SpotifyCommandMessage)
  }

  const handleToggleRepeat = () => {
    let nextRepeatState: 'off' | 'context' | 'track' = 'off'
    if (spotifyData.repeatState === 'off') {
      nextRepeatState = 'context'
    } else if (spotifyData.repeatState === 'context') {
      nextRepeatState = 'track'
    }
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_REPEAT',
      repeatState: nextRepeatState,
    } as SpotifyCommandMessage)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
  }

  const handleVolumeChangeCommitted = (newVolume: number) => {
    sendData({
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: newVolume,
    } as SpotifyCommandMessage)
  }

  return (
    <Box sx={{ width: '100%', p: 2 }} aria-label="Spotify Controls">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <img
          src={spotifyData.albumArtUrl || '/default-album-art.png'}
          alt={spotifyData.trackName}
          width={56}
          height={56}
        />
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {spotifyData.trackName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {spotifyData.artist}
          </Typography>
        </Box>
      </Box>
      <ProgressBar
        progressMs={spotifyData.progressMs || 0}
        durationMs={spotifyData.durationMs || 1}
        onSeek={handleSeek}
      />
      <PlaybackControls
        isPlaying={spotifyData.isPlaying}
        shuffleState={spotifyData.shuffleState || false}
        repeatState={spotifyData.repeatState || 'off'}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onVolumeChangeCommitted={handleVolumeChangeCommitted}
      />
    </Box>
  )
}

export default SpotifyControls
