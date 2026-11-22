import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['scripts/**/*.ts', 'tests/**/*.ts'],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs', '**/*.mjs'],
  ignore: [
    '.github',
    'node_modules',
    'dist',
    '.next',
    'coverage',
    'playwright-report',
    'test-results',
    'ecosystem.config.cjs',
    'scripts/get-available-port.mjs',
    'public/assets',
    'public/screenshots',
    'public/**/*.wav',
    'public/**/*.svg',
    'public/**/*.json',
    'next.config.js',
    'jest.config.cjs',
    'commitlint.config.cjs',
    'playwright.config.ts',
    'eslint.config.mjs',
    'tests/unit/mocks/webBluetooth.ts',
    'deploy/ecosystem.config.cjs',
    'deploy/next.config.js',
  ],
  ignoreDependencies: ['@types/web-bluetooth'],
  ignoreBinaries: ['scripts/test-json-with-server.sh'],
  // Spawned by path in tests/playwright/infrastructure.spec.ts; knip 6 reads it as an import.
  ignoreUnresolved: ['./scripts/start-production.sh'],
}

export default config
