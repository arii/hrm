import { PaletteOptions } from '@mui/material/styles'

/**
 * The custom theme palettes.
 *
 * @see https://mui.com/customization/palette/
 */
export const palettes = {
  light: {
    primary: {
      main: '#F44336', // Red - matches Peak HR zone, high energy
      light: '#EF5350',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2196F3', // Blue - matches Warm-up zone
      light: '#42A5F5',
      dark: '#1976D2',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50', // Green - matches Fat Burn zone
      light: '#66BB6A',
      dark: '#388E3C',
    },
    warning: {
      main: '#FFEB3B', // Yellow - matches Cardio zone
      light: '#FFF176',
      dark: '#FBC02D',
      contrastText: '#000000',
    },
    error: {
      main: '#F44336', // Red - matches Peak zone
      light: '#EF5350',
      dark: '#D32F2F',
    },
    info: {
      main: '#2196F3', // Blue
    },
    background: {
      default: '#F5F5F5', // Light grey for main background
      paper: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
    },
    divider: '#E0E0E0',
  },
  dark: {
    primary: {
      main: '#E53935',
      light: '#EF5350',
      dark: '#C62828',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1E88E5',
      light: '#42A5F5',
      dark: '#1565C0',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#43A047',
      light: '#66BB6A',
      dark: '#2E7D32',
    },
    warning: {
      main: '#FDD835',
      light: '#FFF176',
      dark: '#FBC02D',
      contrastText: '#000000',
    },
    error: {
      main: '#E53935',
      light: '#EF5350',
      dark: '#C62828',
    },
    info: {
      main: '#1E88E5',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#BDBDBD',
      disabled: '#757575',
    },
    divider: '#424242',
  },
} as const satisfies Record<'light' | 'dark', PaletteOptions>
