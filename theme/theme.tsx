'use client'

import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material/styles'
import {
  createContext,
  FC,
  ReactNode,
  useMemo,
  useState,
} from 'react'
import { designTokens } from './designTokens'
import CssBaseline from '@mui/material/CssBaseline'

// Create a context for the color mode
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
})

interface ThemeProviderProps {
  children: ReactNode
}

const ThemeProvider: FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>('dark')

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'))
      },
    }),
    []
  )

  const theme = useMemo(() => createTheme(designTokens[mode]), [mode])

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  )
}

export default ThemeProvider
