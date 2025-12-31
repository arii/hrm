import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { SessionProvider } from 'next-auth/react'
import { initialize, mswLoader } from 'msw-storybook-addon'
import React from 'react'
import { handlers } from '../stories/mocks/handlers'
import theme from '../lib/theme'
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime' // next 13
import * as NextRouter from 'next/router'

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
    nextRouter: {
      Provider: RouterContext.Provider,
      ...NextRouter,
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
