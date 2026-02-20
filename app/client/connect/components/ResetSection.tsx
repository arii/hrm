import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export interface ResetSectionProps {
  onReset: () => void
  isResetting: boolean
}

/**
 * ResetSection component handles resetting the server state and forgetting the Bluetooth device.
 * Extracted from ConnectView to reduce duplication and improve maintainability.
 */
const ResetSection = ({ onReset, isResetting }: ResetSectionProps) => (
  <Box
    sx={{
      textAlign: 'center',
      mt: 4,
      pt: 4,
      borderTop: (theme) => `1px solid ${theme.palette.divider}`,
    }}
  >
    <Button
      variant="contained"
      color="error"
      onClick={onReset}
      disabled={isResetting}
    >
      {isResetting ? 'Resetting...' : 'Reset Permissions & Settings'}
    </Button>
    <Typography
      variant="caption"
      display="block"
      sx={{ mt: 1, color: 'text.secondary' }}
    >
      Resets server state AND forgets Bluetooth device connection.
    </Typography>
  </Box>
)

export default ResetSection
