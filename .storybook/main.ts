import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    // This is a workaround for a bug in Storybook's Next.js integration.
    // The ProgressPlugin is causing a TypeError: Cannot read properties of undefined (reading 'tap')
    // See: https://github.com/storybookjs/storybook/issues/27068
    config.plugins = config.plugins?.filter(
      (plugin) => plugin?.constructor.name !== 'ProgressPlugin'
    );
    return config;
  },
}
export default config
