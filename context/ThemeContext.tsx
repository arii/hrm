// context/ThemeContext.tsx
'use client'

import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react'
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material'
import { amber, deepOrange, grey } from '@mui/material/colors'

interface ThemeContextType {
  toggleTheme: () => void
  mode: PaletteMode
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useThemeContext = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a AppThemeProvider')
  }
  return context
}

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<PaletteMode>('dark')

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme-mode') as PaletteMode | null
    if (storedTheme) {
      setMode(storedTheme)
    }
  }, [])

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light'
    setMode(newMode)
    localStorage.setItem('theme-mode', newMode)
  }

  const theme = useMemo(() => {
    const getDesignTokens = (mode: PaletteMode) => ({
      palette: {
        mode,
        ...(mode === 'light'
          ? {
              // Palette values for light mode
              primary: amber,
              divider: amber[200],
              text: {
                primary: grey[900],
                secondary: grey[800],
              },
            }
          : {
              // Palette values for dark mode
              primary: deepOrange,
              divider: deepOrange[700],
              background: {
                default: '#121212',
                paper: '#1e1e1e',
              },
              text: {
                primary: '#fff',
                secondary: grey[500],
              },
            }),
      },
    })
    return createTheme(getDesignTokens(mode))
  }, [mode])

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  )
}
