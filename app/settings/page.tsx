// app/settings/page.tsx
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'

export default function SettingsPage() {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1">
        This is a placeholder page for application settings.
      </Typography>
    </Container>
  )
}
