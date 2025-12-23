'use client'

import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import CableIcon from '@mui/icons-material/Cable'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useContext } from 'react'
import { ColorModeContext } from '@/theme/theme'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, href: '/' },
  { label: 'Controls', icon: <SportsEsportsIcon />, href: '/client/control' },
  { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
  { label: 'Connect', icon: <CableIcon />, href: '/client/connect' },
]

export default function BottomNavBar() {
  const pathname = usePathname()
  const theme = useTheme()
  const colorMode = useContext(ColorModeContext)

  // Determine the current value based on the pathname
  const currentValue =
    NAV_ITEMS.find((item) => item.href === pathname)?.href || false

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      elevation={3}
    >
      <BottomNavigation value={currentValue} showLabels>
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={item.icon}
            component={Link}
            href={item.href}
            value={item.href}
            sx={{
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            }}
          />
        ))}
        {/* Theme Switcher */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
          }}
        >
          <IconButton
            onClick={colorMode.toggleColorMode}
            color="inherit"
            aria-label={`Switch to ${
              theme.palette.mode === 'dark' ? 'light' : 'dark'
            } mode`}
          >
            {theme.palette.mode === 'dark' ? (
              <Brightness7Icon />
            ) : (
              <Brightness4Icon />
            )}
          </IconButton>
        </Box>
      </BottomNavigation>
    </Paper>
  )
}
