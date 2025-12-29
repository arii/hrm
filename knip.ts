import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'app/**/{page,layout,template,error,loading}.tsx',
    'app/**/route.ts',
    'tests/**/*.ts',
    'stories/**/*.tsx',
    'server.ts',
    'proxy.ts',
    'next.config.js',
    'playwright.config.ts',
    'jest.config.cjs',
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
    // types for web bluetooth api
    '@types/web-bluetooth',
    // Eslint plugin
    'eslint-plugin-react',
  ],
  ignoreBinaries: [
    'scripts/test-json-with-server.sh',
    'scripts/test-with-server.sh',
    'python3',
  ],
}

export default config
