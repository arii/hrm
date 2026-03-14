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
        height: '54px',
        minHeight: '54px',
        maxHeight: '54px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        boxSizing: 'border-box',
        overflow: 'hidden',
        p: 0,
        m: 0,
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
