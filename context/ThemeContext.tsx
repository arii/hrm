'use client'

import React, {
  createContext,
  useState,
  useMemo,
  useContext,
  ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createAppTheme } from '@/lib/theme/index'

type ThemeMode = 'light' | 'dark'

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useThemeMode = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const savedMode =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('themeMode') as ThemeMode | null)
          : null
      return savedMode || 'light'
    } catch (error) {
      console.error('Could not access localStorage:', error)
      return 'light'
    }
  })

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light'
      try {
        window.localStorage.setItem('themeMode', newMode)
      } catch (error) {
        console.error('Could not access localStorage:', error)
      }
      return newMode
    })
  }

  // Memoize the theme object to prevent unnecessary re-renders
  const theme: Theme = useMemo(() => createAppTheme(mode), [mode])

  const contextValue = useMemo(() => ({ mode, toggleTheme }), [mode])

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
