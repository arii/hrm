'use client'

import { IconButton } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import { useTheme } from '@/context/ThemeContext'

const ThemeSwitcher = () => {
  const { mode, toggleTheme } = useTheme()

  return (
    <IconButton onClick={toggleTheme} color="inherit">
      {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  )
}

export default ThemeSwitcher
