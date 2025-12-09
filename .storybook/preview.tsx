import type { Preview } from "@storybook/react";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Roboto_Mono } from 'next/font/google'; // Requires @storybook/nextjs framework
import theme from '../lib/theme'; // Import your custom theme

// Initialize font for Storybook environment
const robotoMono = Roboto_Mono({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Inject the font variable class wrapper */}
        <div className={robotoMono.className} style={{ fontFamily: robotoMono.style.fontFamily }}>
          {/* Manually set the variable if the component uses var(--font-roboto-mono) */}
          <style>{`
            :root {
              --font-roboto-mono: ${robotoMono.style.fontFamily};
            }
          `}</style>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
