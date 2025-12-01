// context/ThemeContext.tsx
'use client'
import React, { createContext, useContext, useMemo } from 'react'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

type ThemeContextType = {
  toggleTheme: () => void
  mode: 'dark' | 'light'
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
)

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preferences, setPreferences] = useUserPreferences()

  const toggleTheme = () => {
    setPreferences((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }))
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: preferences.theme,
        },
      }),
    [preferences.theme]
  )

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode: preferences.theme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within an AppThemeProvider')
  }
  return context
}
