'use client'

import { createTheme, responsiveFontSizes } from '@mui/material/styles'

// Define the color palette
const palette = {
  primary: {
    main: '#6C63FF', // A modern, vibrant purple
    light: '#A39DFF',
    dark: '#5B52CC',
  },
  secondary: {
    main: '#FF6584', // A complementary pink for accents
    light: '#FF9EAD',
    dark: '#D9526D',
  },
  tertiary: {
    main: '#47D1C6', // A cool teal for additional accents
  },
  background: {
    default: '#f4f6f8',
    paper: '#ffffff',
  },
  text: {
    primary: '#333333',
    secondary: '#555555',
  },
}

// Create the base theme
let theme = createTheme({
  palette,
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
  },
  spacing: 8, // Base spacing unit
  shape: {
    borderRadius: 12, // Consistent rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: '16px',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      `,
    },
  },
})

// Apply responsive font sizes
theme = responsiveFontSizes(theme)

export default theme
