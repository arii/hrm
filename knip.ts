import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  next: {
    entry: [
      'app/**/page.tsx',
      'app/**/layout.tsx',
      'app/**/route.ts',
      'middleware.ts',
    ],
  },
  entry: [
    'scripts/**/*.ts',
  ],
  project: ['**/*.{js,ts,tsx,cjs,mjs}'],
  ignore: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    'deploy/**',
    'playwright-report/**',
    'storybook-static/**',
    'test-results/**',
    'coverage/**',
    'eslint.config.mjs',
  ],
  ignoreDependencies: [
    '@types/web-bluetooth',
    'eslint-plugin-storybook',
    'dotenv',
  ],
  ignoreBinaries: [
    'scripts/test-json-with-server.sh',
    'scripts/test-with-server.sh',
    'python3',
  ],
}

export default config
