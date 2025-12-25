import { PaletteMode } from '@mui/material';
import { red } from '@mui/material/colors';

export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    error: {
      main: red.A400,
    },
    ...(mode === 'light'
      ? {
          // palette values for light mode
          background: {
            default: '#fff',
            paper: '#f5f5f5',
          },
          text: {
            primary: '#000',
            secondary: '#555',
          },
        }
      : {
          // palette values for dark mode
          background: {
            default: '#121212',
            paper: '#1e1e1e',
            overlay: 'rgba(0, 0, 0, 0.5)',
          },
          text: {
            primary: '#fff',
            secondary: '#aaa',
          },
        }),
    warning: {
        main: '#f57c00',
    },
    info: {
        main: '#0288d1',
    },
    success: {
        main: '#388e3c',
    },
  },
  zIndex: {
    loadingIndicator: 1500,
  }
});
