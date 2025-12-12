// File: app/components/MuteButton.tsx
/**
 * A reusable IconButton that toggles the global audio mute state.
 * It uses the `useVolumePreference` hook to access and modify the application-wide
 * volume and mute settings, ensuring a consistent state across all components.
 * The icon automatically updates to reflect the current mute status.
 */
'use client'
import { VolumeOff, VolumeUp } from '@mui/icons-material'
import IconButton, { IconButtonProps } from '@mui/material/IconButton'
import useVolumePreference from '@/hooks/useVolumePreference'

const MuteButton = (props: IconButtonProps) => {
  const { muted, toggleMute } = useVolumePreference()

  return (
    <IconButton
      onClick={toggleMute}
      size="small"
      sx={{ color: 'text.secondary' }}
      aria-label={muted ? 'Unmute' : 'Mute'}
      {...props}
    >
      {muted ? <VolumeOff /> : <VolumeUp />}
    </IconButton>
  )
}

export default MuteButton
