import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import type { SpotifyDevice } from '@/types/core'

interface SpotifyDeviceDropdownProps {
  devices: SpotifyDevice[]
  selectedDeviceId: string
  disabled: boolean
  onSelect: (deviceId: string) => void
}

/**
 * Inline device picker for the control page (#9298). Kept as a Select
 * dropdown (not the shared popover SpotifyDeviceSelector) to preserve the
 * control page's existing UX.
 */
const SpotifyDeviceDropdown = ({
  devices,
  selectedDeviceId,
  disabled,
  onSelect,
}: SpotifyDeviceDropdownProps) => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
      Device
    </Typography>
    <FormControl fullWidth size="small">
      <Select
        value={selectedDeviceId}
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        sx={{
          color: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'grey.600',
          },
          '& .MuiSvgIcon-root': {
            color: 'white',
          },
        }}
        data-testid="spotify-device-select"
      >
        {devices.map((device) => (
          <MenuItem
            key={device.id}
            value={device.id}
            data-testid={`spotify-device-select-option-${device.id}`}
          >
            {device.name} {device.is_active && '(Active)'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
)

export default SpotifyDeviceDropdown
