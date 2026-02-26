import { usePathname } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useMemo } from 'react'

export const useGlobalPlayerVisibility = () => {
  const pathname = usePathname()
  const { spotifyData, timerData } = useWebSocket()
  const { isLoggedIn } = useSpotifyAuth()

  return useMemo(() => {
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
}
