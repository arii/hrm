'use client'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { SpotifyDevice } from '@/types/core'

interface SpotifyDeviceSelectorProps {
  devices: SpotifyDevice[]
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
  disabled?: boolean
}

const SpotifyDeviceSelector = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  disabled,
}: SpotifyDeviceSelectorProps) => {
  if (devices.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
        Device
      </Typography>
      <FormControl fullWidth size="small">
        <Select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value as string)}
          disabled={disabled}
          sx={{
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'grey.600',
            },
            '& .MuiSvgIcon-root': { color: 'white' },
          }}
          data-testid="spotify-device-select"
        >
          {devices.map((d: SpotifyDevice) => (
            <MenuItem
              key={d.id}
              value={d.id}
              data-testid={`spotify-device-select-option-${d.id}`}
            >
              {d.name} {d.is_active && '(Active)'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default SpotifyDeviceSelector
