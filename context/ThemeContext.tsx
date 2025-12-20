'use client'
import {
  createContext,
  useState,
  useMemo,
  useContext,
  ReactNode,
  useEffect,
} from 'react'
import {
  ThemeProvider as MUIThemeProvider,
  CssBaseline,
  PaletteMode,
} from '@mui/material'
import { createCustomTheme } from '@/lib/theme'
import useLocalStorage from '@/hooks/useLocalStorage'

interface ThemeContextType {
  toggleTheme: () => void
  mode: PaletteMode
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [storedMode, setStoredMode] = useLocalStorage<PaletteMode>(
    'themeMode',
    'light'
  )
  const [mode, setMode] = useState<PaletteMode>(storedMode)

  useEffect(() => {
    setMode(storedMode)
  }, [storedMode])

  const toggleTheme = () => {
    setStoredMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }

  const theme = useMemo(() => createCustomTheme(mode), [mode])

  return (
    <ThemeContext.Provider value={{ toggleTheme, mode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
