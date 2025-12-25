'use client'
import { useTheme } from '@mui/material/styles'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import IconButton from '@mui/material/IconButton'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useContext } from 'react'
import { ColorModeContext } from '@/app/context/ColorModeContext'

export default function BottomNavBar() {
  const pathname = usePathname()
  const theme = useTheme()
  const colorMode = useContext(ColorModeContext)
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
        backgroundColor: theme.palette.background.paper,
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
      <IconButton
        sx={{ ml: 1 }}
        onClick={colorMode.toggleColorMode}
        color="inherit"
      >
        {theme.palette.mode === 'dark' ? (
          <Brightness7Icon />
        ) : (
          <Brightness4Icon />
        )}
      </IconButton>
    </BottomNavigation>
  )
}
