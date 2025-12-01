// components/SettingsPanel.tsx
'use client'
import React, { useCallback, useRef, useEffect } from 'react'
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material'
import VolumeControl from './Spotify/VolumeControl'
import { useWebSocket } from '@/context/WebSocketContext'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { SpotifyCommandMessage, TimerConfigMessage } from '@/types/websocket'
import { useTheme } from '@/context/ThemeContext'
import Button from '@mui/material/Button'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { connectionStatus, sendData } = useWebSocket()
  const { volume, setVolume } = useVolumePreference()
  const { mode, toggleTheme } = useTheme()
  const lastSentVolumeRef = useRef<string | null>(null)

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return

      const sanitized = clampVolume(value)
      // Note: We don't have device context here, so we send a general volume command.
      // The server-side logic should apply it to the active device.
      const messageKey = `general:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, sendData]
  )

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 250, p: 2 }} role="presentation" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <Typography variant="h6" component="div">
          Settings
        </Typography>
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItem>
            <VolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onVolumeChangeCommitted={sendVolumeCommand}
            />
          </ListItem>
          <ListItem>
            <FormControlLabel
              control={
                <Switch
                  checked={mode === 'dark'}
                  onChange={toggleTheme}
                  name="theme-toggle"
                />
              }
              label="Dark Mode"
            />
          </ListItem>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Timer Presets
          </Typography>
          <ListItem>
            <Button
              variant="outlined"
              onClick={() => {
                const message: TimerConfigMessage = {
                  type: 'TIMER_CONFIG',
                  workDuration: 20,
                  restDuration: 10,
                }
                sendData(message)
              }}
              sx={{ width: '100%' }}
            >
              Tabata 20/10
            </Button>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  )
}

export default SettingsPanel
