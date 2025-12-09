import type { Preview } from "@storybook/react";
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../lib/theme';
import React from 'react';

const withMuiTheme = (Story) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Story />
  </ThemeProvider>
);

const preview: Preview = {
  decorators: [withMuiTheme],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
