// lib/theme.ts
import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    timer: {
      prepare: string
      work: string
      rest: string
      cooldown: string
      running: string
      idle: string
    }
  }
  interface PaletteOptions {
    timer?: {
      prepare?: string
      work?: string
      rest?: string
      cooldown?: string
      running?: string
      idle?: string
    }
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: '#EF4444',
    },
    secondary: {
      main: '#2563EB',
    },
    success: {
      main: '#22C55E',
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#3B82F6',
    },
    timer: {
      prepare: '#F59E0B', // Yellow/Warning
      work: '#EF4444', // Red
      rest: '#22C55E', // Green
      cooldown: '#3B82F6', // Blue
      running: '#2563EB', // Blue/Primary
      idle: '#6B7280', // Gray
    },
  },
})

export default theme
