// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "components/theme";

export const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Story />
    </ThemeProvider>
  ),
];

const preview: Preview = {
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
