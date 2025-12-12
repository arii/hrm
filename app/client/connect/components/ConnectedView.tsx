// app/client/connect/components/ConnectedView.tsx
import { Box, Button, Fade, Paper, Typography } from '@mui/material'
import HrTile from '@/components/HrTile'
import { HrZoneProps } from '@/utils/visualization'

interface ConnectedViewProps {
  userName: string
  userAge: string
  currentHR: number
  hrZoneProps: HrZoneProps
  connectionStatus: string
  onDisconnect: () => void
}

const ConnectedView = ({
  userName,
  userAge,
  currentHR,
  hrZoneProps,
  connectionStatus,
  onDisconnect,
}: ConnectedViewProps) => {
  return (
    <Fade in={true}>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="overline" color="success.main" fontWeight="bold">
            ● LIVE STREAMING
          </Typography>
        </Box>
        <Box sx={{ mb: 3 }}>
          <HrTile
            name={userName}
            bpm={currentHR}
            percentMax={hrZoneProps.percentage}
            isAlerting={currentHR === 0}
            alertMessage="Waiting for data... Check device fit."
          />
        </Box>
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                SESSION PROFILE
              </Typography>
              <Typography variant="body1" fontWeight="500">
                {userName}{' '}
                <Typography component="span" color="text.secondary">
                  ({userAge}yo)
                </Typography>
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              WS: {connectionStatus}
            </Typography>
          </Box>
        </Paper>
        <Box sx={{ mt: 'auto' }}>
          <Button
            variant="outlined"
            color="error"
            size="large"
            fullWidth
            onClick={onDisconnect}
            sx={{
              borderWidth: 2,
              '&:hover': { borderWidth: 2 },
            }}
          >
            STOP & DISCONNECT
          </Button>
        </Box>
      </Box>
    </Fade>
  )
}

export default ConnectedView
