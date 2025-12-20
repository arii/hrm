'use client'

import React from 'react'
import { IconButton } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import { useThemeMode } from '@/context/ThemeContext'

export const ThemeSwitcher: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode()

  return (
    <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
      {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  )
}
