'use client'

import { useTheme } from '@/context/ThemeContext'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function BottomNavBar() {
  const { mode, toggleTheme } = useTheme()
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
      sx={(theme) => ({
        width: '100%',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: theme.palette.background.paper,
        boxShadow: theme.shadows[1],
      })}
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
        icon={<SettingsIcon />}
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
        label={mode === 'light' ? 'Dark' : 'Light'}
        aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
        icon={mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        onClick={toggleTheme}
        sx={{
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: 'action.hover',
          },
        }}
      />
    </BottomNavigation>
  )
}
