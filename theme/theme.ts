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
      hrZones: {
        warmUp: string
        fatBurn: string
        cardio: string
        peak: string
        max: string
        unknown: string
        noData: string
      }
    }
  }
  interface PaletteOptions {
    custom?: {
      prepare?: string
      work?: string
      rest?: string
      running?: string
      idle?: string
      cooldown?: string
      hrZones?: {
        warmUp?: string
        fatBurn?: string
        cardio?: string
        peak?: string
        max?: string
        unknown?: string
        noData?: string
      }
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
      hrZones: {
        warmUp: '#9E9E9E',
        fatBurn: '#2196F3',
        cardio: '#4CAF50',
        peak: '#FFEB3B',
        max: '#F44336',
        unknown: '#9e9e9e',
        noData: '#e0e0e0',
      },
    },
  },
})

export default theme
