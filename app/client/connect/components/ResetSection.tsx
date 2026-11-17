import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

export interface ResetSectionProps {
  onReset: () => void
  isResetting: boolean
}

const RESET_EXPLANATION =
  'Forgets the strap in this browser and clears device settings. Connect then asks you to pick the strap again.'

// Kept apart from the workout controls and behind a confirmation, so a
// mid-workout tap cannot unpair the strap.
const ResetSection = ({ onReset, isResetting }: ResetSectionProps) => {
  const [confirming, setConfirming] = useState(false)

  return (
    <Box
      data-testid="reset-section"
      sx={{
        textAlign: 'center',
        mt: 4,
        pt: 4,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Button
        variant="outlined"
        color="error"
        onClick={() => setConfirming(true)}
        disabled={isResetting}
      >
        {isResetting ? 'Resetting...' : 'Reset Permissions & Settings'}
      </Button>
      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 1, color: 'text.secondary' }}
      >
        {RESET_EXPLANATION}
      </Typography>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Forget the strap?</DialogTitle>
        <DialogContent>
          <DialogContentText>{RESET_EXPLANATION}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirming(false)
              onReset()
            }}
          >
            Forget strap
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ResetSection
