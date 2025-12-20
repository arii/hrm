import { createTheme, ThemeOptions } from '@mui/material/styles'
import { lightPalette } from './lightPalette'
import { darkPalette } from './darkPalette' // Import the new dark palette
import { typography } from './typography'
import { components } from './components'
import { shape } from './shape'
import { shadows } from './shadows'
import { spacing } from './spacing'
import { transitions } from './transitions'
import { zIndex } from './zIndex'
import { breakpoints } from './breakpoints'

// Extend the MUI theme types to include custom properties
declare module '@mui/material/styles' {
  interface ZIndex {
    loadingIndicator: number
  }
  interface TypeBackground {
    overlay: string
  }
}

/**
 * Creates a complete MUI theme object based on the provided mode.
 * @param mode - The theme mode ('light' or 'dark').
 * @returns A complete MUI theme object.
 */
export const createAppTheme = (mode: 'light' | 'dark') => {
  const palette = mode === 'light' ? lightPalette : darkPalette

  const themeOptions: ThemeOptions = {
    palette,
    typography,
    spacing,
    shape,
    zIndex,
    shadows,
    components,
    breakpoints,
    transitions,
  }

  return createTheme(themeOptions)
}
