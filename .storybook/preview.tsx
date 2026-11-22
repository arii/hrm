import type { Preview } from '@storybook/react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { SessionProvider } from 'next-auth/react'
import React from 'react'
import theme from '../lib/theme'
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime' // next 13
import * as NextRouter from 'next/router'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextRouter: {
      Provider: RouterContext.Provider,
      ...NextRouter,
    },
  },
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
