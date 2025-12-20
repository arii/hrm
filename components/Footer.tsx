'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { ThemeSwitcher } from './ThemeSwitcher'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, textAlign: 'center' }}>
        © {currentYear} HRM Dashboard. All rights reserved.
      </Typography>
      <ThemeSwitcher />
    </Box>
  )
}
