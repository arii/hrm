import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'server.ts',
    'proxy.ts',
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
    'jest.config.cjs',
    'next.config.js',
    'playwright.config.ts',
    'eslint.config.mjs',
    'commitlint.config.cjs',
  ],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs', '**/*.mjs'],
  ignore: [
    'node_modules',
    'dist',
    '.next',
    'coverage',
    'playwright-report',
    'test-results',
    'storybook-static',
    'ecosystem.config.cjs',
    'scripts/get-available-port.mjs',
    'public/mockServiceWorker.js',
  ],
  ignoreDependencies: [
    // Used in tests, but Knip doesn't see it
    'jest-environment-jsdom',
    // types for web bluetooth api
    '@types/web-bluetooth',
    // Eslint plugin
    'eslint-plugin-react',
    'wait-on',
  ],
  ignoreBinaries: [
    'scripts/test-json-with-server.sh',
    'scripts/test-with-server.sh',
    'python3',
    'sleep',
  ],
};

export default config;
