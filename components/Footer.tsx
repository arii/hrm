'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <Box
      component="footer"
      data-testid="footer"
      sx={{
        mt: 'auto',
        height: 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
        © {currentYear} HRM Dashboard. All rights reserved.
      </Typography>
    </Box>
  )
}
