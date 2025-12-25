'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'

export default function SettingsPage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1">
            This is a placeholder page to demonstrate that the Material-UI theme
            is working correctly. You can toggle the theme using the button in
            the bottom navigation bar.
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}
