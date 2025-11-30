'use client'

import DashboardIcon from '@mui/icons-material/Dashboard'
import FavoriteIcon from '@mui/icons-material/Favorite'
import SettingsIcon from '@mui/icons-material/Settings'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Box from '@mui/material/Box'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { href: '/client/control', label: 'Controls', icon: <SettingsIcon /> },
  { href: '/client/connect', label: 'Connect', icon: <FavoriteIcon /> },
]

export default function BottomNavBar() {
  const pathname = usePathname()
  const [value, setValue] = useState(0)

  // Update the active tab when the path changes
  useEffect(() => {
    const activeIndex = navItems.findIndex((item) => item.href === pathname)
    if (activeIndex !== -1) {
      setValue(activeIndex)
    }
  }, [pathname])

  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_event, newValue) => {
          // Navigation is handled by Link components, this just updates the visual state
          setValue(newValue)
        }}
        sx={{
          width: '100%',
          height: '72px', // Increased height
          // Glassmorphism effect
          backgroundColor: 'rgba(20, 20, 20, 0.7)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)', // For Safari
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0px -4px 20px rgba(0, 0, 0, 0.25)',
          position: 'relative', // Parent for the animated indicator
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.href}
            label={item.label}
            icon={item.icon}
            component={Link}
            href={item.href}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'color 0.3s ease',
              '&.Mui-selected': {
                color: 'common.white',
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.8rem',
              },
              '&:hover, &.Mui-focusVisible': {
                backgroundColor: 'transparent',
              },
            }}
          />
        ))}
      </BottomNavigation>
      {/* Animated Indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '8px',
          // Centering logic for the indicator
          left: `calc(${(100 / navItems.length) * value}% + ${
            100 / navItems.length / 2
          }% - 20px)`,
          width: '40px',
          height: '4px',
          backgroundColor: 'primary.main',
          borderRadius: '2px',
          transition: 'left 0.3s cubic-bezier(0.65, 0, 0.35, 1)',
          willChange: 'left',
        }}
      />
    </Box>
  )
}
