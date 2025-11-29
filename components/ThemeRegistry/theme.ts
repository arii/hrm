import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { CSSProperties } from 'react';

// Augment the Theme interface to include our custom variants
declare module '@mui/material/styles' {
  interface TypographyVariants {
    timerDisplay: CSSProperties;
    hrPercentage: CSSProperties;
    hrLabel: CSSProperties;
    controlLabels: CSSProperties;
  }

  interface TypographyVariantsOptions {
    timerDisplay?: CSSProperties;
    hrPercentage?: CSSProperties;
    hrLabel?: CSSProperties;
    controlLabels?: CSSProperties;
  }
}

// Augment the Typography component's props to accept our custom variants
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    timerDisplay: true;
    hrPercentage: true;
    hrLabel: true;
    controlLabels: true;
  }
}

// Create a base theme to access the default breakpoints
let theme = createTheme();

// Now, create the final theme, using the base theme's breakpoints for responsive styles
theme = createTheme(theme, {
  typography: {
    // Replicate the responsive font sizes from the original `sx` props
    timerDisplay: {
      fontWeight: 800,
      letterSpacing: '0.12rem',
      fontSize: '6rem', // Default for xs
      [theme.breakpoints.up('sm')]: {
        fontSize: '8rem',
      },
      [theme.breakpoints.up('md')]: {
        fontSize: '10rem',
      },
    },
    hrPercentage: {
      fontWeight: 900,
      fontSize: '6rem', // Default for xs
      [theme.breakpoints.up('sm')]: {
        fontSize: '7rem',
      },
      [theme.breakpoints.up('md')]: {
        fontSize: '8rem',
      },
    },
    hrLabel: {
      fontWeight: 600,
      fontSize: '1.25rem', // Default for xs
      [theme.breakpoints.up('sm')]: {
        fontSize: '1.5rem',
      },
    },
    controlLabels: {
      fontSize: '0.95rem',
      fontWeight: 500,
    },
  },
});

// Optional: Use responsiveFontSizes to make all typography responsive
theme = responsiveFontSizes(theme);

export default theme;
