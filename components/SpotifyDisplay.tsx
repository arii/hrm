'use client';
import { useTheme } from '@mui/material/styles';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useSession, signOut } from 'next-auth/react';
import { useWebSocket } from '@/context/WebSocketContext';
import { SpotifyCommandMessage } from '@/types/websocket';
import AuthButton from './AuthButton';
import VolumeSlider from './Spotify/VolumeSlider';
import SpotifyDeviceSelectorWrapper from './SpotifyDeviceSelectorWrapper';
import { useState } from 'react';

const SpotifyDisplay = () => {
  const theme = useTheme();
  const { status } = useSession();
  const { spotifyData, sendData } = useWebSocket();
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.reload();
  };

  const sendSpotifyCommand = (
    command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS' | 'TRANSFER_PLAYBACK' | 'SET_VOLUME',
    payload?: Record<string, unknown>
  ) => {
    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command,
      ...payload,
    };
    sendData(message);
  };

  const handlePlayPauseToggle = () => {
    const command = spotifyData.isPlaying ? 'PAUSE' : 'PLAY';
    sendSpotifyCommand(command);
  };

  const handleDeviceSelect = (deviceId: string) => {
    sendSpotifyCommand('TRANSFER_PLAYBACK', { deviceId });
    setDeviceMenuAnchor(null);
  };

  const handleVolumeChange = (newVolume: number) => {
    sendSpotifyCommand('SET_VOLUME', { volume: newVolume });
  };

  const handleToggleMute = () => {
    const newVolume = spotifyData.isMuted ? (spotifyData.lastVolume || 50) : 0;
    sendSpotifyCommand('SET_VOLUME', { volume: newVolume });
  };

  if (status !== 'authenticated') {
    return (
      <Box
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
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
    );
  }

  const { trackName, artist, isPlaying, devices, volume, isMuted } = spotifyData;
  const displayTrackName = trackName === 'Awaiting Login...' ? 'No Active Playback' : trackName;
  const displayArtist = trackName === 'Awaiting Login...' ? '' : `— ${artist}`;

  return (
    <Box
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${isPlaying ? 'Playing' : 'Paused'}`}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
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
        <IconButton
          size="small"
          onClick={() => sendSpotifyCommand('PREVIOUS')}
          color="inherit"
          aria-label="Previous track"
        >
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          size="medium"
          onClick={handlePlayPauseToggle}
          color="inherit"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => sendSpotifyCommand('NEXT')}
          color="inherit"
          aria-label="Next track"
        >
          <SkipNextIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
        <VolumeSlider
          volume={volume || 0}
          muted={isMuted || false}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
        />
        <SpotifyDeviceSelectorWrapper
          availableDevices={devices || []}
          deviceMenuAnchor={deviceMenuAnchor}
          onDeviceSelect={handleDeviceSelect}
          onMenuOpen={(e) => setDeviceMenuAnchor(e.currentTarget)}
          onMenuClose={() => setDeviceMenuAnchor(null)}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
          color="inherit"
          sx={{
            minWidth: 'auto',
            px: 1.5,
            fontSize: '0.75rem',
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default SpotifyDisplay;
