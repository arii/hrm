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
        textAlign: 'center',
        py: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1, m: 0, p: 0 }}
      >
        © {currentYear} HRM Dashboard. All rights reserved.
      </Typography>
    </Box>
  )
}
