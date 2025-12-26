// components/spotify/SpotifyDeviceSelector.tsx
'use client'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import { SpotifyDevice } from '@/types/core'

interface SpotifyDeviceSelectorProps {
  devices: SpotifyDevice[]
  selectedDevice: string | null
  onChange: (deviceId: string) => void
}

const SpotifyDeviceSelector = ({
  devices,
  selectedDevice,
  onChange,
}: SpotifyDeviceSelectorProps) => {
  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel id="spotify-device-selector-label">Device</InputLabel>
      <Select
        labelId="spotify-device-selector-label"
        value={selectedDevice || ''}
        onChange={(e) => onChange(e.target.value)}
        label="Device"
      >
        {devices.map((device) => (
          <MenuItem key={device.id} value={device.id}>
            {device.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default SpotifyDeviceSelector
