'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import MusicNoteIcon from '@mui/icons-material/MusicNote'
import PersonIcon from '@mui/icons-material/Person'
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
    label: 'Experiments',
    href: '/client/experimental',
    icon: <ScienceIcon />,
    ariaLabel: 'Navigate to Experiments page',
  },
  {
    label: 'Profile',
    href: '/client/settings',
    icon: <PersonIcon />,
    ariaLabel: 'Navigate to Profile Settings page',
  },
]

export default function BottomNavBar() {
  const pathname = usePathname()

  const activeValue = NAV_ITEMS.findIndex((item) => {
    if (item.href === '/') return pathname === '/'
    return pathname === item.href || pathname?.startsWith(`${item.href}/`)
  })

  return (
    <BottomNavigation
      data-testid="bottom-nav-bar"
      value={activeValue === -1 ? false : activeValue}
      showLabels
      sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
        // Six tabs must fit a 360px phone: drop MUI's 80px minimum and
        // keep the selected label the same size so tabs never shift.
        '& .MuiBottomNavigationAction-root': {
          minWidth: 0,
          px: { xs: 0.25, sm: 1.5 },
          mx: { xs: 0.25, sm: 0.5 },
          my: 0.5,
          borderRadius: 3,
        },
        '& .MuiBottomNavigationAction-root .MuiSvgIcon-root': {
          fontSize: { xs: '1.6rem', sm: '1.85rem' },
        },
        // Selected tab: filled pill plus bold label, readable at a glance.
        '& .MuiBottomNavigationAction-root.Mui-selected': {
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        },
        '& .MuiBottomNavigationAction-label, & .MuiBottomNavigationAction-label.Mui-selected':
          {
            fontSize: { xs: '0.72rem', sm: '0.95rem' },
            fontWeight: 600,
            whiteSpace: 'nowrap',
          },
        '& .MuiBottomNavigationAction-label.Mui-selected': {
          fontWeight: 800,
        },
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
            color:
              activeValue === index ? 'primary.contrastText' : 'text.primary',
            '&:hover:not(.Mui-selected), &.Mui-focusVisible:not(.Mui-selected)':
              {
                backgroundColor: 'action.hover',
              },
          }}
        />
      ))}
    </BottomNavigation>
  )
}
