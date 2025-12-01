'use client'
import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    active: Palette['primary']
    warning: Palette['primary']
    critical: Palette['primary']
    rest: Palette['primary']
  }

  interface PaletteOptions {
    active?: PaletteOptions['primary']
    warning?: PaletteOptions['primary']
    critical?: PaletteOptions['primary']
    rest?: PaletteOptions['primary']
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFFFFF',
    },
    secondary: {
      main: '#B0B0B0',
    },
    background: {
      default: '#000000',
      paper: 'rgba(255, 255, 255, 0.1)',
    },
    active: {
      main: '#76FF03', // Bright Green
    },
    warning: {
      main: '#FFC107', // Amber
    },
    critical: {
      main: '#FF1744', // Bright Red
    },
    rest: {
      main: '#2979FF', // Bright Blue
    },
  },
  shadows: [
    'none',
    '0 0 5px rgba(118, 255, 3, 0.5)',
    '0 0 10px rgba(118, 255, 3, 0.5)',
    '0 0 15px rgba(118, 255, 3, 0.5)',
    '0 0 20px rgba(255, 193, 7, 0.5)',
    '0 0 25px rgba(255, 193, 7, 0.5)',
    '0 0 30px rgba(255, 193, 7, 0.5)',
    '0 0 35px rgba(255, 23, 68, 0.5)',
    '0 0 40px rgba(255, 23, 68, 0.5)',
    '0 0 45px rgba(255, 23, 68, 0.5)',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1))',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1))',
        },
      },
    },
  },
})

export default theme
