'use client'

import { useMemo } from 'react'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { useServerInsertedHTML } from 'next/navigation'

import { useTheme } from '@/context/ThemeContext'
import { createAppTheme } from '@/lib/theme'

type ThemeRegistryProps = {
  children: React.ReactNode
}

/**
 * The theme registry component.
 *
 * This implementation is taken directly from the MUI official docs:
 * @see https://github.com/mui/material-ui/blob/master/examples/material-ui-nextjs-app-router/src/components/ThemeRegistry/ThemeRegistry.tsx
 */
export const ThemeRegistry = (props: ThemeRegistryProps) => {
  const { children } = props
  const { themeMode } = useTheme()

  const options = { key: 'mui' }

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode])

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
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </CacheProvider>
  )
}
