import {
  createTheme,
  responsiveFontSizes,
  Theme,
} from '@mui/material/styles'
import { PaletteMode } from '@mui/material'

import { components } from './components'
import { palettes } from './palette'
import { shape } from './shape'
import { shadows } from './shadows'
import { typography } from './typography'
import { zIndex } from './zIndex'

/**
 * Creates a theme instance.
 *
 * @param {'light' | 'dark'} mode
 *
 * @see https://mui.com/customization/theming/
 * @see https://mui.com/customization/default-theme/
 */
export const createAppTheme = (mode: PaletteMode): Theme => {
  const theme = createTheme({
    palette: {
      mode,
      ...palettes[mode],
    },
    typography,
    shape,
    shadows,
    zIndex,
    components,
    spacing: 8,
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
  })

  return responsiveFontSizes(theme)
}
