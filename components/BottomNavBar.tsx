'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function BottomNavBar() {
  const pathname = usePathname()
  const [value, setValue] = useState(() => {
    if (pathname === '/client/control') {
      return 1
    } else if (pathname === '/client/connect') {
      return 2
    }
    return 0 // Default to Dashboard
  })

  return (
    <BottomNavigation
      value={value}
      onChange={(_event, newValue) => {
        setValue(newValue)
      }}
      showLabels
      sx={{
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background:
          'linear-gradient(to top, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8))',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
const navActionStyles = {
  '&.Mui-selected': {
    color: '#F43F5E',
  },
  '&:hover, &.Mui-focusVisible': {
    backgroundColor: 'action.hover',
  },
}

      <BottomNavigationAction
        label="Dashboard"
        icon={<DashboardIcon />}
        component={Link}
        href="/"
        sx={navActionStyles}
      />
      <BottomNavigationAction
        label="Phone Controls"
        icon={<SettingsIcon />}
        component={Link}
        href="/client/control"
        sx={navActionStyles}
      />
      <BottomNavigationAction
        label="Stream HR"
        icon={<FavoriteIcon />}
        component={Link}
        href="/client/connect"
        sx={navActionStyles}
      />
    </BottomNavigation>
  )
}
