const config = {
  entry: [
    'scripts/setup.sh',
    'scripts/test-with-server.sh',
    'scripts/kill-all.sh',
    'next.config.js',
    'server.ts',
    'app/**/*.ts',
    'app/**/*.tsx',
    'playwright.config.ts',
    'tests/setup/global.setup.ts',
    'tests/playwright/**/*.spec.ts',
  ],
  project: ['app/**/*.ts', 'app/**/*.tsx'],
  ignore: [
    'node_modules',
    'dist',
    '.next',
    'tests',
    'scripts',
    'app/dev',
    'app/api/debug',
    'app/api/health',
    'app/api/internal/health',
    'app/client/connect/page.tsx',
    'app/client/mock/page.tsx',
    'public',
    'types/generated',
  ],
  ignoreDependencies: [
    'dotenv', // imported for side-effect in server.ts
    'lodash', // used in spotifyPolling.ts
  ],
  ignoreBinaries: ['npx', 'pm2'],
}

export default config
