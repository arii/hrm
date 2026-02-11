'use client'

import { createTheme } from '@mui/material/styles'
import libTheme from '@/lib/theme'

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
        // Aligned with docs/DESIGN_GUIDELINES.md color mappings:
        // Primary -> Peak, Secondary -> Warm-up, Success -> Fat Burn, Warning -> Cardio
        warmUp: '#2196F3', // Secondary (Blue)
        fatBurn: '#4CAF50', // Success (Green)
        cardio: '#FFEB3B', // Warning (Yellow)
        peak: '#F44336', // Primary (Red)
        max: '#D32F2F', // Primary Dark (Dark Red)
        unknown: '#9e9e9e',
        noData: '#e0e0e0',
      },
    },
  },
})

export default theme
