'use client'

import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import BottomNavBar from './BottomNavBar'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useCombinedFooterState } from '@/hooks/useCombinedFooterState'

const SpotifyDisplay = dynamic(() => import('./SpotifyDisplay'), { ssr: false })

export default function CombinedFooter() {
  const { showSpotifyBar, footerHeight } = useCombinedFooterState()

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--footer-height',
      `${footerHeight}px`
    )
    return () => {
      document.documentElement.style.removeProperty('--footer-height')
    }
  }, [footerHeight])

  return (
    <Paper
      component="footer"
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
      {showSpotifyBar && (
        <>
          <SpotifyDisplay />
          <Divider sx={{ opacity: 0.1 }} />
        </>
      )}
      <BottomNavBar />
    </Paper>
  )
}
