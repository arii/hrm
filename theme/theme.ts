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
      idle: string
      paused: string
      finished: string
      cooldown: string
    }
  }
  interface PaletteOptions {
    custom?: {
      prepare?: string
      work?: string
      rest?: string
      running?: string
      idle?: string
      paused?: string
      finished?: string
      cooldown?: string
    }
  }
}

const theme = createTheme(libTheme, {
  palette: {
    custom: {
      prepare: '#f59e0b',
      work: '#ef4444',
      rest: '#22c55e',
      running: '#3b82f6',
      idle: '#6b7280',
      paused: '#f59e0b',
      finished: '#3b82f6',
      cooldown: '#6b7280',
    },
  },
})

export default theme
