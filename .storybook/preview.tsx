import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { SessionProvider } from 'next-auth/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import React from 'react'
import theme from '../lib/theme'

// Initialize MSW
initialize()

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  // Register the MSW loader
  loaders: [mswLoader],
  decorators: [
    (Story) => (
      <SessionProvider session={null}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      </SessionProvider>
    ),
  ],
}

export default preview
