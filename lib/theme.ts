'use client'

import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    active: Palette['primary']
    critical: Palette['primary']
  }
  interface PaletteOptions {
    active?: PaletteOptions['primary']
    critical?: PaletteOptions['primary']
  }
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#29B6F6', // Light Blue - Active/Engaged state
    },
    secondary: {
      main: '#CE93D8', // Purple - Secondary actions
    },
    active: {
      main: '#4CAF50', // Green - Success/Active
    },
    warning: {
      main: '#FFCA28', // Amber - Warning
    },
    critical: {
      main: '#F44336', // Red - Critical/Error
    },
    background: {
      default: '#0D1117', // Dark blue, almost black
      paper: 'rgba(255, 255, 255, 0.05)', // Almost transparent white
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#BDBDBD',
    },
  },

  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '4rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },

  spacing: 8,

  shape: {
    borderRadius: 8,
  },

  shadows: [
    'none', // 0
    '0px 0px 8px rgba(41, 182, 246, 0.2)', // 1 (primary.main glow)
    '0px 0px 12px rgba(76, 175, 80, 0.25)', // 2 (active.main glow)
    '0px 0px 12px rgba(255, 202, 40, 0.25)', // 3 (warning.main glow)
    '0px 0px 12px rgba(244, 67, 54, 0.3)', // 4 (critical.main glow)
    'none', // 5
    'none', // 6
    'none', // 7
    'none', // 8
    'none', // 9
    'none', // 10
    'none', // 11
    'none', // 12
    'none', // 13
    'none', // 14
    'none', // 15
    'none', // 16
    'none', // 17
    'none', // 18
    'none', // 19
    'none', // 20
    'none', // 21
    'none', // 22
    'none', // 23
    'none', // 24
  ],

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(40, 40, 40, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(40, 40, 40, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          minHeight: 48,
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        margin: 'normal',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
  },

  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },

  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
})

export default theme
