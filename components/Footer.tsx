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
        height: 56,
        maxHeight: 56,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 0,
        px: 2,
        overflow: 'hidden',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {currentYear} HRM Dashboard. All rights reserved.
      </Typography>
    </Box>
  )
}
