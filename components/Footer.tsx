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
        height: 54, // Baseline height in VRT
        minHeight: 54,
        maxHeight: 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        boxSizing: 'border-box',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ m: 0, p: 0, lineHeight: 1 }}
      >
        © {currentYear} HRM Dashboard. All rights reserved.
      </Typography>
    </Box>
  )
}
