import {
  createTheme,
  responsiveFontSizes,
  Theme,
} from '@mui/material/styles'
import { PaletteMode } from '@mui/material'

import { baseTheme } from './base'
import { palettes } from './palette'

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
    ...baseTheme,
    palette: {
      mode,
      ...palettes[mode],
    },
  })

  return responsiveFontSizes(theme)
}
