import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

interface ResetSectionProps {
  onReset: () => void
  isResetting: boolean
}

const ResetSection = ({ onReset, isResetting }: ResetSectionProps) => (
  <Box
    sx={{
      textAlign: 'center',
      mt: 4,
      pt: 4,
      borderTop: 1,
      borderColor: 'divider',
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
      Resets stored permissions and device settings, including Bluetooth
      connection.
    </Typography>
  </Box>
)

export default ResetSection
