/**
 * Storybook preview configuration.
 *
 * This file sets up global decorators and parameters for all stories, ensuring a
 * consistent rendering environment.
 *
 * @see https://storybook.js.org/docs/react/writing-stories/decorators
 * @see https://storybook.js.org/docs/react/essentials/backgrounds
 * @see https://storybook.js.org/docs/react/essentials/viewport
 * @see https://storybook.js.org/docs/react/essentials/actions
 * @see https://www.npmjs.com/package/@storybook/addon-a11y
 */

import React from 'react'
import type { Preview, Decorator } from '@storybook/react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { SessionProvider } from 'next-auth/react'
import * as NextImage from 'next/image'
import { initialize, mswLoader } from 'msw-storybook-addon'

import theme from '../lib/theme'
import { handlers } from '../stories/mocks/handlers'

// =============================================================================
// INITIALIZE MSW
// =============================================================================
initialize({}, handlers)

// =============================================================================
// DECORATORS
// =============================================================================

/**
 * Applies the MUI theme to all stories.
 * This ensures that components have access to the application's theme,
 * including colors, typography, and spacing.
 */
export const withMuiTheme: Decorator = (Story, context) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Story {...context} />
  </ThemeProvider>
)

/**
 * Provides a mock NextAuth session to all stories.
 * This prevents components that use `useSession` from crashing.
 * The session is `null` by default, simulating a logged-out state.
 */
export const withMockSession: Decorator = (Story, context) => (
  <SessionProvider
    session={context.parameters.session || null}
    baseUrl={
      context.parameters.nextAuth?.baseUrl || 'http://localhost:3000/api/auth'
    }
  >
    <Story {...context} />
  </SessionProvider>
)

// =============================================================================
// NEXT.JS IMAGE OVERRIDE
// =============================================================================

/**
 * Overrides the default Next.js Image component to disable optimization.
 * Storybook's rendering environment doesn't support Next.js's image optimization,
 * which can cause errors. This forces all instances of `next/image` to be
 * unoptimized.
 *
 * @see https://storybook.js.org/docs/nextjs/getting-started#nextimage
 */
const OriginalNextImage = NextImage.default
Object.defineProperty(NextImage, 'default', {
  configurable: true,
  value: (props) => (
    <OriginalNextImage
      {...props}
      unoptimized
      // WORKAROUND: Force a blur placeholder to prevent a Vercel-specific error
      // in the Storybook environment.
      // @see https://github.com/vercel/next.js/issues/52535
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ACoA//9k="
    />
  ),
})

// =============================================================================
// GLOBAL PARAMETERS
// =============================================================================

const preview: Preview = {
  decorators: [withMuiTheme, withMockSession],
  loaders: [mswLoader],
  parameters: {
    //
    // Configure MSW
    //
    msw: {
      handlers: handlers,
    },
    //
    // Configure story backgrounds for different themes
    //
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#F5F5F5', // theme.palette.background.default
        },
        {
          name: 'dark',
          value: '#212121', // Common dark theme background
        },
        {
          name: 'workout',
          value: '#000000', // Workout view background
        },
      ],
    },

    //
    // Define a custom viewport set for responsive design testing
    //
    viewport: {
      viewports: {
        iphone12: {
          name: 'iPhone 12 Pro',
          styles: {
            width: '390px',
            height: '844px',
          },
        },
        ipad: {
          name: 'iPad',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
      },
    },

    //
    // Configure the accessibility addon
    // @see https://www.npmjs.com/package/@storybook/addon-a11y
    //
    a11y: {
      config: {
        rules: [
          {
            // Ensure color contrast meets WCAG AA standards
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },

    //
    // Default configuration for the actions addon
    //
    actions: { argTypesRegex: '^on[A-Z].*' },

    //
    // Default configuration for the controls addon
    //
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
