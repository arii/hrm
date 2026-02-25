'use client'

import { usePathname } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import SpotifyDisplay from './SpotifyDisplay'
import BottomNavBar from './BottomNavBar'
import { useEffect, useMemo } from 'react'

export default function CombinedFooter({
  onHeightChange,
}: {
  onHeightChange?: (h: number) => void
}) {
  const pathname = usePathname()
  const { spotifyData, timerData } = useWebSocket()
  const { isLoggedIn } = useSpotifyAuth()

  const showSpotifyBar = useMemo(() => {
    if (pathname === '/client/control') return false
    return (
      spotifyData.playback.is_playing ||
      timerData.isRunning ||
      timerData.currentPhase !== 'IDLE' ||
      pathname === '/client/spotify-selection' ||
      (!isLoggedIn && pathname === '/')
    )
  }, [
    pathname,
    spotifyData.playback.is_playing,
    timerData.isRunning,
    timerData.currentPhase,
    isLoggedIn,
  ])

  const height = showSpotifyBar ? 104 : 56

  useEffect(() => onHeightChange?.(height), [height, onHeightChange])

  return (
    <Paper
      elevation={10}
      data-testid="combined-footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        height,
        transition: 'height 0.3s ease-in-out',
        overflow: 'hidden',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {showSpotifyBar && (
        <>
          <SpotifyDisplay isIntegrated />
          <Divider sx={{ opacity: 0.1 }} />
        </>
      )}
      <BottomNavBar isIntegrated />
    </Paper>
  )
}
