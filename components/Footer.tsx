'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        py: 2,
        px: 2,
        textAlign: 'center',
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
