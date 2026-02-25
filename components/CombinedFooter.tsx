'use client'

import { usePathname } from 'next/navigation'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import SpotifyDisplay from './SpotifyDisplay'
import BottomNavBar from './BottomNavBar'
import { useEffect, useMemo } from 'react'

interface CombinedFooterProps {
  onHeightChange?: (height: number) => void
}

/**
 * CombinedFooter integrates Spotify playback controls and the main navigation bar
 * into a single, unified persistent element at the bottom of the screen.
 *
 * This addresses the "double footer" issue on mobile by reducing vertical space
 * consumption and providing contextual display logic.
 */
export default function CombinedFooter({
  onHeightChange,
}: CombinedFooterProps) {
  const pathname = usePathname()
  const { spotifyData, timerData } = useWebSocket()
  const { isLoggedIn } = useSpotifyAuth()

  // Contextual logic for showing the Spotify mini-player
  const isWorkoutActive =
    timerData.isRunning || timerData.currentPhase !== 'IDLE'
  const isMusicPlaying = spotifyData.playback.is_playing
  const isSpotifyPage = pathname === '/client/spotify-selection'
  const isControlPage = pathname === '/client/control'

  const showSpotifyBar = useMemo(() => {
    // Hide on the primary control page to avoid UI redundancy, as that page
    // already provides full-screen Spotify controls.
    if (isControlPage) return false

    // Show the bar if music is actively playing, if a workout session is in progress,
    // or if the user is currently on the Spotify selection page.
    if (isMusicPlaying || isWorkoutActive || isSpotifyPage) return true

    // Also show on the dashboard if not logged in to allow easy login access.
    if (!isLoggedIn && pathname === '/') return true

    // Otherwise, hide the bar to reclaim vertical screen real estate.
    return false
  }, [
    isControlPage,
    isMusicPlaying,
    isWorkoutActive,
    isSpotifyPage,
    isLoggedIn,
    pathname,
  ])

  // Calculate the total height of the footer based on its current state.
  // Spotify mini-player is 48px (integrated), BottomNavBar is 56px.
  const height = showSpotifyBar ? 104 : 56

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(height)
    }
  }, [height, onHeightChange])

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
        // Ensure the footer doesn't exceed its calculated height
        height: `${height}px`,
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
