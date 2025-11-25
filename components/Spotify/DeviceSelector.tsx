// components/Spotify/DeviceSelector.tsx
import React, { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import SpeakerIcon from '@mui/icons-material/Speaker'

interface SpotifyDevice {
  id: string
  is_active: boolean
  name: string
}

interface DeviceSelectorProps {
  devices: SpotifyDevice[]
  onDeviceSelect: (deviceId: string) => void
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  onDeviceSelect,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (deviceId: string) => {
    onDeviceSelect(deviceId)
    handleClose()
  }

  return (
    <div>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select playback device"
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
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
              onClick={() => handleSelect(device.id)}
              selected={device.is_active}
            >
              {device.name} {device.is_active && '✓'}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No devices available</MenuItem>
        )}
      </Menu>
    </div>
  )
}

export default DeviceSelector
