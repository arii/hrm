import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'app/**/*.ts',
    'app/**/*.tsx',
    'components/**/*.ts',
    'components/**/*.tsx',
    'constants/**/*.ts',
    'context/**/*.tsx',
    'hooks/**/*.ts',
    'lib/**/*.ts',
    'scripts/**/*.ts',
    'services/**/*.ts',
    'tests/**/*.ts',
    'types/**/*.ts',
    'utils/**/*.ts',
    'stories/**/*.ts',
    'stories/**/*.tsx',
    '.storybook/**/*.ts',
    '.storybook/**/*.tsx',
  ],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs', '**/*.mjs'],
  paths: {
    '@/*': ['./*'],
  },
  ignore: [
    '.github',
    'node_modules',
    'dist',
    '.next',
    'coverage',
    'playwright-report',
    'test-results',
    'storybook-static',
    'ecosystem.config.cjs',
    'scripts/get-available-port.mjs',
    'public/assets',
    'public/screenshots',
    'public/**/*.wav',
    'public/**/*.svg',
    'public/**/*.json',
    'public/mockServiceWorker.js',
    'next.config.js',
    'jest.config.cjs',
    'commitlint.config.cjs',
    'playwright.config.ts',
    'eslint.config.mjs',
    'tests/unit/mocks/webBluetooth.ts',
  ],
  ignoreDependencies: [
    // types for web bluetooth api
    '@types/web-bluetooth',
    // Eslint plugin
    'eslint-plugin-storybook',
    'dotenv',
  ],
  ignoreBinaries: ['scripts/test-json-with-server.sh', 'python3'],
  next: {
    entry: ['server.ts', 'proxy.ts'],
  },
  jest: {
    config: [
      'jest.config.cjs',
      'jest.config.components.cjs',
      'jest.config.integration.cjs',
    ],
    entry: ['tests/**/*.ts', 'tests/**/*.tsx'],
  },
}

export default config
