'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

// Define UI-specific colors for workout statuses
// These are decoupled from HR Zone colors (Domain Logic)
const STATUS_COLORS = {
  SUCCESS: '#4CAF50', // Green
  NEUTRAL: '#cccccc', // Grey
  WARNING: '#FBC02D', // Amber/Yellow
  INFO: '#2196F3', // Blue
  AMBER: '#f59e0b', // Amber
  RED: '#ef4444', // Red
  GREEN_BRIGHT: '#22c55e', // Bright Green
  GREY_DARK: '#6b7280', // Dark Grey
}

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: STATUS_COLORS.SUCCESS,
      idle: STATUS_COLORS.NEUTRAL,
      paused: STATUS_COLORS.WARNING,
      finished: STATUS_COLORS.INFO,
      prepare: STATUS_COLORS.AMBER,
      work: STATUS_COLORS.RED,
      rest: STATUS_COLORS.GREEN_BRIGHT,
      cooldown: STATUS_COLORS.GREY_DARK,
    },
  },
})

export default theme
