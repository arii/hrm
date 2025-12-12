'use client'

import { createTheme } from '@mui/material/styles'

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
  // Updated to align with Frontend Improvement Plan Phase 1
  palette: {
    primary: {
      main: '#D32F2F', // Red - matches Peak HR zone (Zone 4)
      light: '#FFEBEE', // Very light red for backgrounds
      dark: '#C62828',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1976D2', // Blue - matches Warm-up zone (Zone 1)
      light: '#E3F2FD', // Very light blue for backgrounds
      dark: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#388E3C', // Green - matches Fat Burn zone (Zone 2)
      light: '#E8F5E9', // Very light green for backgrounds
      dark: '#1B5E20',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FBC02D', // Yellow - matches Cardio zone (Zone 3)
      light: '#FFFDE7', // Very light yellow for backgrounds
      dark: '#F57F17',
      contrastText: '#000000',
    },
    error: {
      main: '#D32F2F', // Red
      light: '#EF5350',
      dark: '#C62828',
    },
    info: {
      main: '#0288D1', // Light Blue
      light: '#E1F5FE',
      dark: '#01579B',
    },
    // Background colors
    background: {
      default: '#FAFAFA', // Slightly cleaner light grey
      paper: '#FFFFFF',
    },
    // Text colors
    text: {
      primary: '#121212', // Higher contrast
      secondary: '#616161',
      disabled: '#BDBDBD',
    },
    // Dividers
    divider: '#EEEEEE',
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
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
    },

    // Section headings (HR Percentage)
    h2: {
      fontSize: '2.5rem', // 40px
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },

    // Card titles
    h3: {
      fontSize: '2rem', // 32px
      fontWeight: 600,
      lineHeight: 1.3,
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

    // Small headings (HR Label)
    h6: {
      fontSize: '1.1rem', // 17.6px (Close to 1.1rem requested)
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },

    // Body text
    body1: {
      fontSize: '1rem', // 16px
      lineHeight: 1.5,
    },

    // Secondary body text (Control labels)
    body2: {
      fontSize: '0.95rem', // ~15px
      fontWeight: 500,
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
      color: '#757575',
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
  spacing: 8, // Base unit = 8px

  // Shape - Consistent border radius
  shape: {
    borderRadius: 8, // 8px rounded corners for cards, buttons
  },

  // Shadows - Consistent elevation (Subtle gradients and shadows)
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)', // elevation 1
    '0px 4px 8px rgba(0,0,0,0.05)', // elevation 2
    '0px 8px 16px rgba(0,0,0,0.05)', // elevation 3
    '0px 12px 24px rgba(0,0,0,0.05)', // elevation 4
    '0px 16px 32px rgba(0,0,0,0.05)', // elevation 5
    '0px 20px 40px rgba(0,0,0,0.05)', // elevation 6
    '0px 24px 48px rgba(0,0,0,0.05)', // elevation 7
    '0px 28px 56px rgba(0,0,0,0.05)', // elevation 8
    '0px 32px 64px rgba(0,0,0,0.05)', // elevation 9
    '0px 36px 72px rgba(0,0,0,0.05)', // elevation 10
    '0px 40px 80px rgba(0,0,0,0.05)', // elevation 11
    '0px 44px 88px rgba(0,0,0,0.05)', // elevation 12
    '0px 48px 96px rgba(0,0,0,0.05)', // elevation 13
    '0px 52px 104px rgba(0,0,0,0.05)', // elevation 14
    '0px 56px 112px rgba(0,0,0,0.05)', // elevation 15
    '0px 60px 120px rgba(0,0,0,0.05)', // elevation 16
    '0px 64px 128px rgba(0,0,0,0.05)', // elevation 17
    '0px 68px 136px rgba(0,0,0,0.05)', // elevation 18
    '0px 72px 144px rgba(0,0,0,0.05)', // elevation 19
    '0px 76px 152px rgba(0,0,0,0.05)', // elevation 20
    '0px 80px 160px rgba(0,0,0,0.05)', // elevation 21
    '0px 84px 168px rgba(0,0,0,0.05)', // elevation 22
    '0px 88px 176px rgba(0,0,0,0.05)', // elevation 23
    '0px 92px 184px rgba(0,0,0,0.05)', // elevation 24
  ],

  // Component-specific overrides
  components: {
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
          transition: 'all 0.2s ease-in-out', // Smooth transition
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)', // Subtle lift effect
          },
          '&:focus-visible': {
            outline: '2px solid #1976D2', // Focus state
            outlineOffset: '2px',
          },
        },
        contained: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
          '&:hover': {
            boxShadow: '0px 6px 12px rgba(0,0,0,0.1)',
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
          transition: 'background-color 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(0,0,0,0.05)',
        },
        elevation3: {
          boxShadow: '0px 8px 16px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976D2', // Hover state
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: '#1976D2', // Focus state
          },
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
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollBehavior: 'smooth',
        },
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
