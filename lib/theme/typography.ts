import { TypographyOptions } from '@mui/material/styles/createTypography'

export const typography: TypographyOptions = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),

  // Large display numbers (HR values, timer)
  h1: {
    fontSize: '4rem', // 64px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },

  // Section headings
  h2: {
    fontSize: '2.5rem', // 40px
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },

  // Card titles
  h3: {
    fontSize: '2rem', // 32px
    fontWeight: 600,
    lineHeight: 1.4,
  },

  // Subsection headings
  h4: {
    fontSize: '1.5rem', // 24px
    fontWeight: 600,
    lineHeight: 1.4,
  },

  // Component labels
  h5: {
    fontSize: '1.25rem', // 20px
    fontWeight: 600,
    lineHeight: 1.5,
  },

  // Small headings
  h6: {
    fontSize: '1rem', // 16px
    fontWeight: 600,
    lineHeight: 1.5,
  },

  // Body text
  body1: {
    fontSize: '1rem', // 16px
    lineHeight: 1.5,
  },

  // Secondary body text
  body2: {
    fontSize: '0.875rem', // 14px
    lineHeight: 1.5,
  },

  // Button text
  button: {
    fontSize: '0.875rem', // 14px
    fontWeight: 600,
    textTransform: 'none', // Don't force uppercase
    letterSpacing: '0.02em',
  },

  // Captions
  caption: {
    fontSize: '0.75rem', // 12px
    lineHeight: 1.5,
  },

  // Overlines (labels above content)
  overline: {
    fontSize: '0.75rem', // 12px
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
}
