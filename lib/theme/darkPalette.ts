import { PaletteOptions } from '@mui/material/styles'

export const darkPalette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#EF5350', // Lighter Red for dark background
    light: '#F44336',
    dark: '#D32F2F',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#42A5F5', // Lighter Blue
    light: '#2196F3',
    dark: '#1976D2',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#66BB6A', // Lighter Green
    light: '#4CAF50',
    dark: '#388E3C',
  },
  warning: {
    main: '#FFF176', // Lighter Yellow
    light: '#FFEB3B',
    dark: '#FBC02D',
    contrastText: '#000000',
  },
  error: {
    main: '#EF5350', // Lighter Red
    light: '#F44336',
    dark: '#D32F2F',
  },
  info: {
    main: '#42A5F5', // Lighter Blue
  },
  background: {
    default: '#121212', // Dark grey for main background
    paper: '#1E1E1E', // Slightly lighter grey for cards
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BDBDBD',
    disabled: '#757575',
  },
  divider: '#424242',
}
