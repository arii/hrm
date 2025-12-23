'use client'

import { PaletteMode } from '@mui/material'
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

/**
 * The shape of the theme context.
 */
type ThemeContextValue = {
  themeMode: PaletteMode
  toggleThemeMode: () => void
}

/**
 * The theme context.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  toggleThemeMode: () => {},
})

/**
 * The theme provider component.
 *
 * @param {PropsWithChildren} props
 */
export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<PaletteMode>('light')

  const toggleThemeMode = useCallback(() => {
    setThemeMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({
      themeMode,
      toggleThemeMode,
    }),
    [themeMode, toggleThemeMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * The useTheme hook.
 */
export const useTheme = () => useContext(ThemeContext)
