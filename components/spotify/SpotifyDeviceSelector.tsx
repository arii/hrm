// components/spotify/SpotifyDeviceSelector.tsx
'use client'

import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { SpotifyDevice } from '@/types/spotify'

interface SpotifyDeviceSelectorProps {
  availableDevices: SpotifyDevice[]
  deviceMenuAnchor: null | HTMLElement
  onDeviceSelect: (deviceId: string) => void
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void
  onMenuClose: () => void
}

const SpotifyDeviceSelector = ({
  availableDevices,
  deviceMenuAnchor,
  onDeviceSelect,
  onMenuOpen,
  onMenuClose,
}: SpotifyDeviceSelectorProps) => {
  return (
    <>
      <IconButton
        onClick={onMenuOpen}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select Spotify device"
        aria-controls="spotify-device-menu"
        aria-haspopup="true"
      >
        <SpeakerIcon />
      </IconButton>
      <Menu
        id="spotify-device-menu"
        anchorEl={deviceMenuAnchor}
        open={Boolean(deviceMenuAnchor)}
        onClose={onMenuClose}
        MenuListProps={{
          'aria-labelledby': 'spotify-device-button',
        }}
      >
        {availableDevices.map((device) => (
          <MenuItem
            key={device.id}
            selected={device.is_active}
            onClick={() => onDeviceSelect(device.id)}
          >
            {device.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default SpotifyDeviceSelector
