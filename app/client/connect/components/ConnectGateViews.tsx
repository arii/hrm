import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'
import ResetSection from './ResetSection'

export const ConnectLoading = ({
  reducedMotion,
}: {
  reducedMotion: boolean
}) => (
  <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
    {reducedMotion ? (
      <HourglassTopIcon
        data-testid="connect-loading"
        sx={{ fontSize: 40, color: 'text.secondary' }}
      />
    ) : (
      <CircularProgress data-testid="connect-loading" />
    )}
  </Container>
)

export const BluetoothUnsupported = ({
  onFullReset,
  isResetting,
}: {
  onFullReset: () => void
  isResetting: boolean
}) => (
  <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
    <BluetoothDisabledIcon
      sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }}
    />
    <Typography variant="h5" gutterBottom>
      Bluetooth Not Supported
    </Typography>
    <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
      <Typography variant="body2" gutterBottom>
        Your browser does not support Web Bluetooth or Bluetooth is disabled.
        Please use Google Chrome, Edge, or Bluefy (on iOS).
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        If Bluetooth is disabled for this browser, we suggest using Google
        Chrome and checking{' '}
        <Link
          href="chrome://flags/#enable-web-bluetooth-new-permissions-backend"
          sx={{ wordBreak: 'break-all' }}
        >
          chrome://flags/#enable-web-bluetooth-new-permissions-backend
        </Link>
        , which links automatically to enabling Bluetooth in settings.
      </Typography>
    </Alert>
    <ResetSection onReset={onFullReset} isResetting={isResetting} />
  </Container>
)
