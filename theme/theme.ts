'use client'

import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-inter)',
    h1: {
      fontSize: '4rem', // 64px
      fontWeight: 700,
    },
    h2: {
      fontSize: '3rem', // 48px
      fontWeight: 700,
    },
    h3: {
      fontSize: '2.5rem', // 40px
      fontWeight: 700,
    },
    h4: {
      fontSize: '2rem', // 32px
      fontWeight: 700,
    },
    h5: {
      fontSize: '1.5rem', // 24px
      fontWeight: 700,
    },
    h6: {
      fontSize: '1rem', // 16px
      fontWeight: 700,
    },
    body1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
    },
    button: {
      fontWeight: 600,
    },
  },
})

export default theme
