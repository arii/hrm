import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'scripts/**/*.ts',
    'tests/**/*.ts',
    'stories/**/*.ts',
    'stories/**/*.tsx',
    '.storybook/*.ts',
    '.storybook/*.tsx',
  ],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs', '**/*.mjs'],
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
    'deploy/ecosystem.config.cjs',
    'deploy/next.config.js',
    'deploy/next.config.ts',
  ],
  ignoreDependencies: [
    '@types/web-bluetooth',
    'eslint-plugin-storybook',
    'dotenv',
    'bats',
  ],
  ignoreBinaries: ['scripts/test-json-with-server.sh', 'python3'],
}

export default config
