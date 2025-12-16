import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { SessionProvider } from 'next-auth/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import React from 'react'
import { handlers } from '../stories/mocks/handlers'
import theme from '../lib/theme'

// Initialize MSW
initialize({}, handlers)

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Ensure MSW handles requests by default
    msw: {
      handlers: handlers,
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
