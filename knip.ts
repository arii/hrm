import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    // Next.js app router entries
    'app/**/layout.tsx',
    'app/**/page.tsx',
    'app/api/**/route.ts',
    // Custom server
    'server.ts',
    'proxy.ts',
    // Standalone scripts
    'scripts/**/*.ts',
    // Storybook
    'stories/**/*.ts',
    'stories/**/*.tsx',
    '.storybook/**/*.ts',
    '.storybook/**/*.tsx',
    // Config files
    'jest.config.cjs',
    'jest.config.components.cjs',
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
    'next-env.d.ts',
  ],
  ignoreDependencies: [
    // Used in tests, but Knip doesn't see it
    'jest-environment-jsdom',
    // types for web bluetooth api
    '@types/web-bluetooth',
    // used in package.json scripts
    'wait-on',
    'husky'
  ],
  ignoreBinaries: [
    'scripts/test-json-with-server.sh',
    'scripts/test-with-server.sh',
    'python3',
    'sleep',
  ],
}

export default config
