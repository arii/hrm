// app/client/connect/components/UnsupportedBrowserView.tsx
import { Alert, Container, Typography } from '@mui/material'
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled'

const UnsupportedBrowserView = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
      <BluetoothDisabledIcon
        sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }}
      />
      <Typography variant="h5" gutterBottom>
        Bluetooth Not Supported
      </Typography>
      <Alert severity="warning">
        Your browser does not support Web Bluetooth. Please use Google Chrome,
        Edge, or Bluefy (on iOS).
      </Alert>
    </Container>
  )
}

export default UnsupportedBrowserView
