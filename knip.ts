// knip.ts
import { type KnipConfig } from 'knip'

const config: KnipConfig = {
  entry: [
    'server.ts',
    'proxy.ts',
    'scripts/setup.sh',
    'next.config.js',
    'tests/playwright/playwright.config.ts',
    'eslint.config.mjs',
    'commitlint.config.cjs',
    'jest.config.cjs',
    'jest.config.components.cjs',
    'postcss.config.mjs',
  ],
  project: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs'],
}

export default config
