'use client'

import Box from '@mui/material/Box'
import BottomNavBar from './BottomNavBar'
import { alpha } from '@mui/material/styles'

export default function FooterControls() {
  return (
    <Box
      component="footer"
      sx={(theme) => ({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100, // Ensure it's above other content
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile portrait, row on landscape/tablet
        alignItems: 'center', // Center vertically in row mode
        bgcolor: 'background.paper',
        boxShadow: `0px -2px 10px ${alpha(theme.palette.common.black, 0.1)}`,
      })}
    >
      <Box
        sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: '200px' } }}
      >
        <BottomNavBar />
      </Box>
    </Box>
  )
}
