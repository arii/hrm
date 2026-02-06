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
    },
  },
  typography: {
    fontFamilyMono: '"Roboto Mono", "Courier New", monospace',
  },
})

export default theme
