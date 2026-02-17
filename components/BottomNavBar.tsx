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

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <DashboardIcon />,
    ariaLabel: 'Navigate to Dashboard page',
  },
  {
    label: 'Controls',
    href: '/client/control',
    icon: <SettingsIcon />,
    ariaLabel: 'Navigate to Phone Controls page',
  },
  {
    label: 'Stream',
    href: '/client/connect',
    icon: <FavoriteIcon />,
    ariaLabel: 'Navigate to Stream Heart Rate page',
  },
  {
    label: 'Spotify',
    href: '/client/spotify-selection',
    icon: <MusicNoteIcon />,
    ariaLabel: 'Navigate to Spotify Selection page',
  },
  {
    label: 'Analytics',
    href: '/client/experimental',
    icon: <ScienceIcon />,
    ariaLabel: 'Navigate to Experimental Analytics page',
  },
]

export default function BottomNavBar() {
  const pathname = usePathname()

  const value = NAV_ITEMS.findIndex((item) =>
    item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
  )
  const activeValue = value === -1 ? 0 : value

  return (
    <BottomNavigation
      value={activeValue}
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
      {NAV_ITEMS.map((item, index) => (
        <BottomNavigationAction
          key={item.href}
          label={item.label}
          aria-label={item.ariaLabel}
          icon={item.icon}
          component={Link}
          href={item.href}
          sx={{
            color: activeValue === index ? 'primary.main' : 'text.secondary',
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      ))}
    </BottomNavigation>
  )
}
