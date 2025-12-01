// components/SettingsPanel.tsx
'use client'

import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Stack,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useThemeContext } from '@/context/ThemeContext'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage, TimerCommandMessage } from '@/types/websocket'
import VolumeControl from './Spotify/VolumeControl'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const SettingsPanel = ({ open, onClose }: SettingsPanelProps) => {
  const { mode, toggleTheme } = useThemeContext()
  const { volume, setVolume } = useVolumePreference()
  const { sendData, spotifyData } = useWebSocket()

  const handlePresetClick = (work: number, rest: number) => {
    const message: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'SET',
      workDuration: work,
      restDuration: rest,
    }
    sendData(message)
    onClose() // Close panel after selection
  }

  const handleVolumeChangeCommitted = (newVolume: number) => {
    if (!spotifyData.trackName) return

    const message: SpotifyCommandMessage = {
      type: 'SPOTIFY_COMMAND',
      command: 'SET_VOLUME',
      volume: newVolume,
    }
    sendData(message)
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: 300,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
        role="presentation"
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6" component="div">
            Settings
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            General
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />}
            label="Dark Mode"
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Volume
          </Typography>
          <VolumeControl
            volume={volume}
            onVolumeChange={setVolume}
            onVolumeChangeCommitted={handleVolumeChangeCommitted}
          />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            Timer Presets
          </Typography>
          <Stack spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handlePresetClick(20, 10)}
            >
              Tabata (20s / 10s)
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handlePresetClick(30, 15)}
            >
              HIIT (30s / 15s)
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handlePresetClick(60, 0)}
            >
              Stretch (60s)
            </Button>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  )
}

export default SettingsPanel
