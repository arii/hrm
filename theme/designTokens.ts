// theme/designTokens.ts
import { PaletteMode } from '@mui/material'

export const designTokens = {
  light: {
    palette: {
      mode: 'light' as PaletteMode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: '#ffffff',
        paper: '#f5f5f5',
      },
    },
    typography: {
      fontFamily: 'Roboto, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
    },
    spacing: 8, // Base spacing unit
  },
  dark: {
    palette: {
      mode: 'dark' as PaletteMode,
      primary: {
        main: '#90caf9',
      },
      secondary: {
        main: '#f48fb1',
      },
      background: {
        default: '#303030',
        paper: '#424242',
      },
    },
    typography: {
      fontFamily: 'Roboto, sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
    },
    spacing: 8, // Base spacing unit
  },
}
