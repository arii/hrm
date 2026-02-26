'use client'

import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import { SpotifyContent } from './SpotifyDisplay'
import { BottomNavContent } from './BottomNavBar'
import { useGlobalPlayerVisibility } from '@/hooks/useGlobalPlayerVisibility'
import { useEffect } from 'react'

export default function CombinedFooter() {
  const isVisible = useGlobalPlayerVisibility()
  const height = isVisible ? 104 : 56

  useEffect(() => {
    document.documentElement.style.setProperty('--footer-height', `${height}px`)
    return () => {
      document.documentElement.style.removeProperty('--footer-height')
    }
  }, [height])

  return (
    <Paper
      component="footer"
      role="contentinfo"
      elevation={10}
      data-testid="combined-footer"
      role="contentinfo"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        height: footerHeight,
        transition: 'height 0.3s ease-in-out',
        overflow: 'hidden',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {isVisible && (
        <>
          <SpotifyContent />
          <Divider sx={{ opacity: 0.1 }} />
        </>
      )}
      <BottomNavContent />
    </Paper>
  )
}
