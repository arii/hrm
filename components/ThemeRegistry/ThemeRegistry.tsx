'use client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { useServerInsertedHTML } from 'next/navigation'
import * as React from 'react'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../lib/theme' // Correctly import the new theme

// This implementation is taken directly from the MUI official docs:
// https://github.com/mui/material-ui/blob/master/examples/material-ui-nextjs-app-router/src/components/ThemeRegistry/ThemeRegistry.tsx

type ThemeRegistryProps = {
  options: { key: string }
  children: React.ReactNode
}

export default function ThemeRegistry(props: ThemeRegistryProps) {
  const { options, children } = props

  const [{ cache, flush }] = React.useState(() => {
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

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kicks in a consistent baseline style and applies body background */}
        <CssBaseline />
        {/* Global styles can be added here if needed, but CssBaseline from theme is preferred */}
        {children}
      </ThemeProvider>
    </CacheProvider>
  )
}
