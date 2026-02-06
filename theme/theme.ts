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
      cooldown: string
      resting: string
      warmUp: string
      fatBurn: string
      cardio: string
      peak: string
      max: string
    }
  }
  interface PaletteOptions {
    custom?: {
      prepare?: string
      work?: string
      rest?:string
      running?: string
      idle?: string
      cooldown?: string
      resting?: string
      warmUp?: string
      fatBurn?: string
      cardio?: string
      peak?: string
      max?: string
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
      cooldown: '#6b7280',
      resting: '#9E9E9E',
      warmUp: '#3498db',
      fatBurn: '#2ecc71',
      cardio: '#f1c40f',
      peak: '#e67e22',
      max: '#e74c3c',
    },
  },
})

export default theme
