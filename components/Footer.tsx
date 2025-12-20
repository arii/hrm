'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ThemeSwitcher from './ThemeSwitcher'
import { Stack } from '@mui/material'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          © {currentYear} HRM Dashboard. All rights reserved.
        </Typography>
        <ThemeSwitcher />
      </Stack>
    </Box>
  )
}
