import { PaletteOptions } from '@mui/material/styles'

export const lightPalette: PaletteOptions = {
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
  // Background colors
  background: {
    default: '#F5F5F5', // Light grey for main background
    paper: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)', // Added for loading indicator
  },
  // Text colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
  },
  // Dividers
  divider: '#E0E0E0',
}
