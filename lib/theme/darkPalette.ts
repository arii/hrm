// In dark mode, we invert the luminance of colors.
// Primary, secondary, success, and error colors are often less saturated.
// Backgrounds become dark, and text becomes light.

export const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#EF5350', // Lighter red for dark background
    light: '#F44336',
    dark: '#D32F2F',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#42A5F5', // Lighter blue
    light: '#2196F3',
    dark: '#1976D2',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#66BB6A', // Lighter green
    light: '#4CAF50',
    dark: '#388E3C',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FFF176', // Lighter yellow
    light: '#FFEB3B',
    dark: '#FBC02D',
    contrastText: '#000000', // Black text still works well here
  },
  error: {
    main: '#EF5350', // Lighter red
    light: '#F44336',
    dark: '#D32F2F',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#42A5F5', // Lighter blue
  },
  background: {
    default: '#121212', // Standard dark mode background
    paper: '#1E1E1E', // Slightly lighter for paper elements
    overlay: 'rgba(255, 255, 255, 0.1)', // Overlay for dark mode
  },
  text: {
    primary: '#FFFFFF', // White text
    secondary: '#BDBDBD', // Grey for secondary text
    disabled: '#757575',
  },
  divider: '#424242', // Darker divider
}
