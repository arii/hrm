import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: ['scripts/**/*.ts', 'tests/**/*.ts'],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.cjs', '**/*.mjs'],
  ignore: [
    'scripts/get-available-port.mjs',
    'deploy/ecosystem.config.cjs',
    'deploy/next.config.js',
  ],
  ignoreDependencies: ['@types/web-bluetooth'],
  // Spawned by path in tests/playwright/infrastructure.spec.ts; knip 6 reads it as an import.
  ignoreUnresolved: ['./scripts/start-production.sh'],
}

export default config
