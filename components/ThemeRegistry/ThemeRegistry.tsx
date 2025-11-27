'use client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { useServerInsertedHTML } from 'next/navigation'
import * as React from 'react'

// --- ADD THESE IMPORTS ---
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
// --- END OF NEW IMPORTS ---

// This implementation is taken directly from the MUI official docs:
// https://github.com/mui/material-ui/blob/master/examples/material-ui-nextjs-app-router/src/components/ThemeRegistry/ThemeRegistry.tsx

// --- CREATE YOUR THEME HERE ---
const theme = createTheme() // Create a base theme first to access breakpoints

theme.typography.timerDisplay = {
  fontSize: '6rem', // Default for xs
  fontWeight: 700,
  [theme.breakpoints.up('sm')]: {
    fontSize: '8rem',
  },
  [theme.breakpoints.up('md')]: {
    fontSize: '10rem',
  },
}

theme.typography.hrPercentage = {
  fontSize: '6rem', // Default for xs
  fontWeight: 900,
  [theme.breakpoints.up('sm')]: {
    fontSize: '7rem',
  },
  [theme.breakpoints.up('md')]: {
    fontSize: '8rem',
  },
}

theme.typography.hrLabel = {
  fontSize: '1.25rem', // Default for xs
  fontWeight: 600,
  [theme.breakpoints.up('sm')]: {
    fontSize: '1.5rem',
  },
}

theme.typography.controlLabel = {
  fontSize: '0.95rem',
  fontWeight: 500,
}
// ------------------------------

declare module '@mui/material/styles' {
  interface TypographyVariants {
    timerDisplay: React.CSSProperties
    hrPercentage: React.CSSProperties
    hrLabel: React.CSSProperties
    controlLabel: React.CSSProperties
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    timerDisplay?: React.CSSProperties
    hrPercentage?: React.CSSProperties
    hrLabel?: React.CSSProperties
    controlLabel?: React.CSSProperties
  }
}

// Update the Typography's variant prop options
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    timerDisplay: true
    hrPercentage: true
    hrLabel: true
    controlLabel: true
    // Disable unused variants if needed
    h3: false
    h4: false
    h5: false
    h6: false
    subtitle1: false
    subtitle2: false
    body2: false
    caption: false
    overline: false
  }
}
// ------------------------------

type ThemeRegistryProps = {
  options: { key: string }
  children: React.ReactNode
}

export default function ThemeRegistry(props: ThemeRegistryProps) {
  const { options, children } = props

  const [{ cache, flush }] = React.useState(() => {
    // ... (rest of the cache logic remains the same)
    const cache = createCache(options)
    cache.compat = true
    const prevInsert = cache.insert
    let inserted: string[] = []
    cache.insert = (...args) => {
      const serialized = args[1]
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name)
      }
      return prevInsert(...args)
    }
    const flush = () => {
      const prevInserted = inserted
      inserted = []
      return prevInserted
    }
    return { cache, flush }
  })

  useServerInsertedHTML(() => {
    // ... (rest of the useServerInsertedHTML logic remains the same)
    const names = flush()
    if (names.length === 0) {
      return null
    }
    let styles = ''
    for (const name of names) {
      styles += cache.inserted[name]
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    )
  })

  // --- WRAP CHILDREN WITH THE PROVIDERS ---
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kicks in a consistent baseline style */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}
