'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

// Define UI-specific colors for workout statuses
// Uses existing MUI palette tokens where possible, with fallbacks for specific needs
// These are decoupled from HR Zone colors (Domain Logic)

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: libTheme.palette.success.main, // #4CAF50 (Green 500)
      idle: libTheme.palette.action.disabled, // standard disabled color
      paused: libTheme.palette.warning.main, // #FFEB3B (Yellow)
      finished: libTheme.palette.info.main, // #2196F3 (Blue)
      prepare: '#f59e0b', // Amber
      work: '#ef4444', // Red
      rest: '#22c55e', // Bright Green
      cooldown: '#6b7280', // Dark Grey
    },
  },
})

export default theme
