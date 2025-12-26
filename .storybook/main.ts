import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-essentials',
    'msw-storybook-addon',
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  staticDirs: ['../public'],

  features: {
    experimentalNext: true,
  }
}
export default config
