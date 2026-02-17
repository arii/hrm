'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

// Define UI-specific colors for workout statuses
// Uses existing MUI palette tokens where possible, with fallbacks for specific needs
// These are decoupled from HR Zone colors (Domain Logic)
const STATUS_COLORS = {
  AMBER: '#f59e0b',
  RED: '#ef4444',
  GREEN_BRIGHT: '#22c55e',
  GREY_DARK: '#6b7280',
}

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: libTheme.palette.success.main, // #4CAF50 (Green 500)
      idle: libTheme.palette.action.disabled, // standard disabled color
      paused: libTheme.palette.warning.main, // #FFEB3B (Yellow) -> Note: libTheme defines warning.main as Yellow
      finished: libTheme.palette.info.main, // #2196F3 (Blue)
      prepare: STATUS_COLORS.AMBER,
      work: STATUS_COLORS.RED,
      rest: STATUS_COLORS.GREEN_BRIGHT,
      cooldown: STATUS_COLORS.GREY_DARK,
    },
  },
})

export default theme
