'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      prepare: string
      work: string
      rest: string
      running: string
      paused: string
      finished: string
      idle: string
      cooldown: string
    }
  }
  interface PaletteOptions {
    custom?: {
      prepare?: string
      work?: string
      rest?: string
      running?: string
      paused?: string
      finished?: string
      idle?: string
      cooldown?: string
    }
  }
}

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
