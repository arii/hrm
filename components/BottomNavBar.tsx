'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import ScienceIcon from '@mui/icons-material/Science'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export default function BottomNavBar() {
  const pathname = usePathname()

  const value = useMemo(() => {
    if (pathname?.startsWith('/client/control')) return 1
    if (pathname?.startsWith('/client/connect')) return 2
    if (pathname?.startsWith('/client/spotify-selection')) return 3
    if (pathname?.startsWith('/client/experimental')) return 4
    return 0
  }, [pathname])

  return (
    <BottomNavigation
      value={value}
      showLabels
      sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <BottomNavigationAction
        label="Dashboard"
        aria-label="Navigate to Dashboard page"
        icon={<DashboardIcon />}
        component={Link}
        href="/"
        sx={{
          color: value === 0 ? 'primary.main' : 'text.secondary',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Controls"
        aria-label="Navigate to Phone Controls page"
        icon={<SettingsIcon />}
        component={Link}
        href="/client/control"
        sx={{
          color: value === 1 ? 'primary.main' : 'text.secondary',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Stream"
        aria-label="Navigate to Stream Heart Rate page"
        icon={<FavoriteIcon />}
        component={Link}
        href="/client/connect"
        sx={{
          color: value === 2 ? 'primary.main' : 'text.secondary',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Spotify"
        aria-label="Navigate to Spotify Selection page"
        icon={<MusicNoteIcon />}
        component={Link}
        href="/client/spotify-selection"
        sx={{
          color: value === 3 ? 'primary.main' : 'text.secondary',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Analytics"
        aria-label="Navigate to Experimental Analytics page"
        icon={<ScienceIcon />}
        component={Link}
        href="/client/experimental"
        sx={{
          color: value === 4 ? 'primary.main' : 'text.secondary',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
    </BottomNavigation>
  )
}
