// components/Spotify/SpotifyDevicePicker.tsx
import React from 'react'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Alert from '@mui/material/Alert'
import SpeakerIcon from '@mui/icons-material/Speaker'
import ComputerIcon from '@mui/icons-material/Computer'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import { ListItemIcon } from '@mui/material'
import { SpotifyDevice } from '@/types'

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type?.toLowerCase()) {
    case 'computer':
      return <ComputerIcon />
    case 'speaker':
      return <SpeakerIcon />
    case 'smartphone':
      return <SmartphoneIcon />
    default:
      return <SpeakerIcon />
  }
}

interface SpotifyDevicePickerProps {
  devices: SpotifyDevice[]
  onSelectDevice: (deviceId: string) => void
}

const SpotifyDevicePicker: React.FC<SpotifyDevicePickerProps> = ({
  devices,
  onSelectDevice,
}) => {
  if (!devices || devices.length === 0) {
    return <Alert severity="info">No Spotify Connect devices found.</Alert>
  }

  return (
    <List>
      {devices.map((device) => (
        <ListItemButton
          key={device.id}
          selected={device.is_active}
          onClick={() => device.id && onSelectDevice(device.id)}
          disabled={!device.id}
        >
          <ListItemIcon>
            <DeviceIcon type={device.type} />
          </ListItemIcon>
          <ListItemText primary={device.name} secondary={device.type} />
        </ListItemButton>
      ))}
    </List>
  )
}

export default SpotifyDevicePicker
