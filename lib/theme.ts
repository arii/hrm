'use client'

import { createTheme } from '@mui/material/styles'
import { reducedMotionStyles } from './theme/animations'

// Extend the MUI theme types to include custom properties
declare module '@mui/material/styles' {
  interface ZIndex {
    loadingIndicator: number
  }
  interface TypeBackground {
    overlay: string
  }
}

/**
 * HRM Application Design System
 *
 * Goals:
 * - Consistent 8px spacing grid
 * - Clear typography hierarchy
 * - Cohesive color palette with proper contrast
 * - Standard shadows and elevation
 * - Unified border radius
 * - Mobile-first with accessible touch targets (48px min)
 */

const theme = createTheme({
  // Color Palette - Vibrant fitness-focused colors
  palette: {
    primary: {
      main: '#F44336', // Red - matches Peak HR zone, high energy
      light: '#EF5350',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2196F3', // Blue - matches Warm-up zone
      light: '#42A5F5',
      dark: '#1976D2',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50', // Green - matches Fat Burn zone
      light: '#66BB6A',
      dark: '#388E3C',
    },
    warning: {
      main: '#FFEB3B', // Yellow - matches Cardio zone
      light: '#FFF176',
      dark: '#FBC02D',
      contrastText: '#000000',
    },
    error: {
      main: '#F44336', // Red - matches Peak zone
      light: '#EF5350',
      dark: '#D32F2F',
    },
    info: {
      main: '#2196F3', // Blue
    },
    // Background colors
    background: {
      default: '#F5F5F5', // Light grey for main background
      paper: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)', // Added for loading indicator
    },
    // Text colors
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
    },
    // Dividers
    divider: '#E0E0E0',
  },

  // Typography - Clear hierarchy
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

    // Large display numbers (HR values, timer)
    h1: {
      fontSize: '4rem', // 64px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },

    // Section headings
    h2: {
      fontSize: '2.5rem', // 40px
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },

    // Card titles
    h3: {
      fontSize: '2rem', // 32px
      fontWeight: 600,
      lineHeight: 1.4,
    },

    // Subsection headings
    h4: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
      lineHeight: 1.4,
    },

    // Component labels
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
      lineHeight: 1.5,
    },

    // Small headings
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },

    // Body text
    body1: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5,
    },

    // Secondary body text
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
    },

    // Button text
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: 600,
      textTransform: 'none', // Don't force uppercase
      letterSpacing: '0.02em',
    },

    // Captions
    caption: {
      fontSize: '0.75rem', // 12px
      lineHeight: 1.5,
    },

    // Overlines (labels above content)
    overline: {
      fontSize: '0.75rem', // 12px
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },

  // Spacing - 8px grid system
  spacing: 8, // Base unit = 8px, theme.spacing(1) = 8px, theme.spacing(2) = 16px, etc.

  // Shape - Consistent border radius
  shape: {
    borderRadius: 8, // 8px rounded corners for cards, buttons
  },

  // zIndex - Consistent layering
  zIndex: {
    appBar: 1200,
    drawer: 1100,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
    loadingIndicator: 9999, // Added for loading indicator
  },

  // Shadows - Consistent elevation
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // elevation 1
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // elevation 2
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // elevation 3
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // elevation 4
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // elevation 5
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 6
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 7
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 8
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 9
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 10
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 11
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 12
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 13
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 14
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 15
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 16
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 17
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 18
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 19
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 20
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 21
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 22
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 23
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // elevation 24
  ],

  // Component-specific overrides
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ...reducedMotionStyles,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          minHeight: 48, // Accessible touch target
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        contained: {
          boxShadow:
            '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
        sizeLarge: {
          padding: '12px 32px',
          fontSize: '1rem',
          minHeight: 56,
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.8125rem',
          minHeight: 40,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48, // Accessible touch target
          minHeight: 48,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Slightly more rounded for cards
          boxShadow:
            '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow:
            '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation4: {
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
          boxShadow:
            '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          boxShadow: theme.shadows[3],
        }),
      },
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },

  // Transitions - Consistent animation timing
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
