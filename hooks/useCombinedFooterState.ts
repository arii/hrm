'use client'

import { usePathname } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useMemo } from 'react'

export const useCombinedFooterState = () => {
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

  const footerHeight = showSpotifyBar ? 104 : 56

  return { showSpotifyBar, footerHeight }
}
