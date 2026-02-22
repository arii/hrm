import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

<<<<<<< HEAD
interface ResetSectionProps {
=======
export interface ResetSectionProps {
>>>>>>> origin/leader
  onReset: () => void
  isResetting: boolean
}

const ResetSection = ({ onReset, isResetting }: ResetSectionProps) => (
  <Box
    sx={{
      textAlign: 'center',
      mt: 4,
      pt: 4,
<<<<<<< HEAD
      borderTop: '1px solid',
=======
      borderTop: 1,
>>>>>>> origin/leader
      borderColor: 'divider',
    }}
  >
    <Button
      variant="contained"
      color="error"
      onClick={onReset}
      disabled={isResetting}
    >
<<<<<<< HEAD
      {isResetting ? 'Resetting...' : 'Reset System & Device'}
=======
      {isResetting ? 'Resetting...' : 'Reset Permissions & Settings'}
>>>>>>> origin/leader
    </Button>
    <Typography
      variant="caption"
      display="block"
      sx={{ mt: 1, color: 'text.secondary' }}
    >
<<<<<<< HEAD
      Resets server state AND forgets Bluetooth device connection.
=======
      Resets stored permissions and device settings, including Bluetooth
      connection.
>>>>>>> origin/leader
    </Typography>
  </Box>
)

export default ResetSection
