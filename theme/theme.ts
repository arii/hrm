'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      running: '#4CAF50', // Green
      idle: '#cccccc', // Grey
      paused: '#FBC02D', // Amber/Yellow
      finished: '#2196F3', // Blue
      prepare: '#f59e0b', // Amber
      work: '#ef4444', // Red
      rest: '#22c55e', // Bright Green
      cooldown: '#6b7280', // Dark Grey
    },
  },
})

export default theme
