import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'server.ts',
    'app/**/{page,layout,loading,error,not-found}.{ts,tsx}',
    'app/api/**/route.ts',
    'scripts/**/*.ts',
    'playwright.config.ts',
  ],
  project: ['**/*.{ts,tsx,js,cjs,mjs}'],
  ignore: [
    '**/*.d.ts',
    'next-env.d.ts',
    'types/**/*',
    'public/mockServiceWorker.js',
    'eslint.config.mjs'
  ],
  ignoreDependencies: [
    '@types/web-bluetooth',
    'eslint-plugin-react',
    'eslint-plugin-storybook',
    'dotenv',
    'eslint-config-next',
    'ts-node',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'typescript'
  ],
  ignoreBinaries: [
    'scripts/test-json-with-server.sh',
    'scripts/test-with-server.sh',
    'python3',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
