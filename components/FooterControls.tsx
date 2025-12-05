'use client'

import Box from '@mui/material/Box'
import BottomNavBar from './BottomNavBar'

export default function FooterControls() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100, // Ensure it's above other content
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile portrait, row on landscape/tablet
        alignItems: 'center', // Center vertically in row mode
        bgcolor: 'background.paper',
        boxShadow: '0px -2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <Box sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: '200px' } }}>
        <BottomNavBar />
      </Box>
    </Box>
  )
}
