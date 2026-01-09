import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'server.ts',
    'proxy.ts',
    'app/**/page.tsx',
    'app/**/layout.tsx',
    'app/api/**/route.ts',
    'scripts/**/*.ts',
    'stories/**/*.tsx',
    'tests/**/*.ts',
    '.storybook/**/*.ts',
  ],
  project: ['**/*.{js,ts,tsx,cjs,mjs}'],
  ignore: [
    '.github',
    'node_modules',
    'dist',
    '.next',
    'coverage',
    'playwright-report',
    'test-results',
    'storybook-static',
    'public/**/!(*.js)',
    '*.config.js',
    '*.config.cjs',
    'eslint.config.mjs',
    'tests/unit/mocks/webBluetooth.ts',
  ],
  ignoreDependencies: [
    '@types/web-bluetooth',
    'eslint-plugin-storybook',
    'dotenv',
    'jest-mock',
  ],
  ignoreBinaries: ['python3'],
}

export default config
