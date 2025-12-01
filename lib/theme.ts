'use client'

import { createTheme } from '@mui/material/styles'

/**
 * HRM Application Design System V2: Glassmorphism & Semantic Colors
 *
 * This theme implements a "Glassmorphism" aesthetic with a dark mode default.
 * Key features:
 * - Dark, vibrant color palette
 * - Semantic color states (active, warning, critical, rest)
 * - "Glowing" shadow effects
 * - Frosted glass effect on Card and Paper components using backdrop-filter
 */

// Define semantic color tokens for reuse
const paletteColors = {
  // Brand & Accent
  active: '#00F5D4', // A vibrant, energetic turquoise for primary actions
  // Semantic States
  warning: '#FFC700', // Bright yellow for cautionary states
  critical: '#FF3B30', // Strong red for critical alerts
  rest: '#03A9F4', // Calming blue for rest/idle states
  // Greyscale & Background
  darkGradientStart: 'rgba(10, 25, 47, 0.9)',
  darkGradientEnd: 'rgba(23, 42, 69, 0.9)',
  glassyWhite: 'rgba(255, 255, 255, 0.1)',
  borderWhite: 'rgba(255, 255, 255, 0.2)',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0C4DE', // Light steel blue for secondary text
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: paletteColors.active,
    },
    secondary: {
      main: paletteColors.rest,
    },
    error: {
      main: paletteColors.critical,
    },
    warning: {
      main: paletteColors.warning,
    },
    success: {
      main: '#34D399', // A clear green for success states
    },
    background: {
      default: '#0A192F', // Deep navy background, essential for the glass effect
      paper: paletteColors.darkGradientStart, // Cards will use this as part of their gradient
    },
    text: {
      primary: paletteColors.textPrimary,
      secondary: paletteColors.textSecondary,
    },
    // Custom semantic colors
    custom: {
      active: paletteColors.active,
      warning: paletteColors.warning,
      critical: paletteColors.critical,
      rest: paletteColors.rest,
    },
  },

  // Glowing Shadows
  shadows: [
    'none',
    `0 0 8px 0 ${paletteColors.active}`, // elevation 1 (Active Glow)
    `0 0 12px 2px ${paletteColors.warning}`, // elevation 2 (Warning Glow)
    `0 0 12px 2px ${paletteColors.critical}`, // elevation 3 (Critical Glow)
    `0 0 12px 2px ${paletteColors.rest}`, // elevation 4 (Rest Glow)
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // 5
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // 6
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 7
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 8
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 9
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 10
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 11
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 12
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 13
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 14
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 15
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 16
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 17
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 18
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 19
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 20
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 21
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 22
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 23
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)', // 24
  ],

  typography: {
    fontFamily: ['"Inter"', 'sans-serif'].join(','),
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      background: `linear-gradient(45deg, ${paletteColors.active}, ${paletteColors.textPrimary})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: { fontSize: '2.5rem', fontWeight: 600 },
    h3: { fontSize: '2rem', fontWeight: 600 },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },

  shape: {
    borderRadius: 16,
  },

  components: {
    // Base components for Glassmorphism
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: paletteColors.glassyWhite,
          backgroundImage: `linear-gradient(135deg, ${paletteColors.darkGradientStart}, ${paletteColors.darkGradientEnd})`,
          border: `1px solid ${paletteColors.borderWhite}`,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(10px)',
          backgroundColor: paletteColors.glassyWhite,
          backgroundImage: `linear-gradient(135deg, ${paletteColors.darkGradientStart}, ${paletteColors.darkGradientEnd})`,
          border: `1px solid ${paletteColors.borderWhite}`,
        },
      },
    },

    // Component adjustments for the new theme
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          minHeight: 48,
          transition: 'all 0.3s ease-in-out',
        },
        containedPrimary: {
          boxShadow: `0 0 8px 0 ${paletteColors.active}`,
          '&:hover': {
            boxShadow: `0 0 16px 4px ${paletteColors.active}`,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent', // Make AppBar transparent for glass effect
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
          borderBottom: `1px solid ${paletteColors.borderWhite}`,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `linear-gradient(180deg, ${paletteColors.darkGradientEnd} 0%, #0A192F 100%)`,
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        },
      },
    },
  },
})

// Extend Theme interface for custom colors
declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      active: string
      warning: string
      critical: string
      rest: string
    }
  }
  interface PaletteOptions {
    custom?: {
      active: string
      warning: string
      critical: string
      rest: string
    }
  }
}

export default theme
