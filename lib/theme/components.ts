import { Components } from '@mui/material/styles'

/**
 * The custom theme components.
 *
 * @see https://mui.com/material-ui/customization/theme-components/
 */
export const components: Components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '10px 24px',
        minHeight: 48, // Accessible touch target
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': {
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
      contained: {
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        '&:hover': {
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
      sizeLarge: {
        padding: '12px 32px',
        fontSize: '1rem',
        minHeight: 56,
      },
      sizeSmall: {
        padding: '6px 16px',
        fontSize: '0.8125rem',
        minHeight: 40,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        minWidth: 48, // Accessible touch target
        minHeight: 48,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12, // Slightly more rounded for cards
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      rounded: {
        borderRadius: 12,
      },
      elevation1: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      elevation2: {
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      elevation3: {
        boxShadow:
          '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      elevation4: {
        boxShadow:
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      margin: 'normal',
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 16,
        fontWeight: 600,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow:
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 12,
        boxShadow: theme.shadows[3],
      }),
    },
  },
}
