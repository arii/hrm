'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Link from 'next/link.js'
import { usePathname } from 'next/navigation.js'
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
        boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Link href="/" passHref>
        <BottomNavigationAction
          label="Dashboard"
          aria-label="Navigate to Dashboard page"
          icon={<DashboardIcon />}
          sx={{
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Link>
      <Link href="/client/control" passHref>
        <BottomNavigationAction
          label="Phone Controls"
          aria-label="Navigate to Phone Controls page"
          icon={<SettingsIcon />}
          sx={{
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Link>
      <Link href="/client/connect" passHref>
        <BottomNavigationAction
          label="Stream HR"
          aria-label="Navigate to Stream Heart Rate page"
          icon={<FavoriteIcon />}
          sx={{
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      </Link>
    </BottomNavigation>
  )
}
