import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'server.ts',
    'app/**/{page,layout,loading,error,not-found}.{ts,tsx}',
    'app/api/**/route.ts',
    'scripts/**/*',
  ],
  project: ['**/*.{ts,tsx,js,cjs,mjs}'],
  ignore: [
    '**/*.d.ts',
    'next-env.d.ts',
    'types/**/*'
  ],
  ignoreDependencies: [
    '@types/*',
    'ts-node', // used in scripts often
    'eslint-config-next' // implicit usage
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
