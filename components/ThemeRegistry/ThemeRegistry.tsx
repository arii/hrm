'use client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
// --- ADD THESE IMPORTS ---
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { useServerInsertedHTML } from 'next/navigation'
import * as React from 'react'
// --- END OF NEW IMPORTS ---

// This implementation is taken directly from the MUI official docs:
// https://github.com/mui/material-ui/blob/master/examples/material-ui-nextjs-app-router/src/components/ThemeRegistry/ThemeRegistry.tsx

// --- CREATE YOUR THEME HERE ---
const theme = createTheme()
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
