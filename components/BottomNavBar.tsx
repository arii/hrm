'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function BottomNavBar() {
  const pathname = usePathname()
  const [value, setValue] = useState(() => {
    switch (pathname) {
      case '/':
        return 0
      case '/client/control':
        return 1
      case '/client/connect':
        return 2
      case '/settings':
        return 3
      default:
        return 0
    }
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
      <BottomNavigationAction
        label="Dashboard"
        aria-label="Navigate to Dashboard page"
        icon={<DashboardIcon />}
        component={Link}
        href="/"
        sx={{
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Phone Controls"
        aria-label="Navigate to Phone Controls page"
        icon={<SmartphoneIcon />}
        component={Link}
        href="/client/control"
        sx={{
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Stream HR"
        aria-label="Navigate to Stream Heart Rate page"
        icon={<FavoriteIcon />}
        component={Link}
        href="/client/connect"
        sx={{
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
      <BottomNavigationAction
        label="Settings"
        aria-label="Navigate to Settings page"
        icon={<SettingsIcon />}
        component={Link}
        href="/settings"
        sx={{
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
    </BottomNavigation>
  )
}
