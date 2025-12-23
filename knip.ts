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
    'eslint-plugin-storybook', // dev dependency
    'eslint-config-next', // dev dependency
    'storybook', // dev dependency
    '@storybook/nextjs', // dev dependency
    'eslint-plugin-prettier', // dev dependency
    '@types/node', // dev dependency
    '@types/react', // dev dependency
    '@types/react-dom', // dev dependency
    '@types/jest', // dev dependency
    '@types/ws', // dev dependency
    'jest', // dev dependency
    'jest-environment-jsdom', // dev dependency
    '@testing-library/jest-dom', // dev dependency
    '@testing-library/react', // dev dependency
    'playwright', // dev dependency
    '@playwright/test', // dev dependency
    'msw', // dev dependency
    'ts-node', // dev dependency
    'cross-env', // dev dependency
    'husky', // dev dependency
    'lint-staged', // dev dependency
    'prettier', // dev dependency
    'typescript', // dev dependency
    '@types/lodash', // dev dependency
    'lodash', // used in spotifyPolling.ts
    'eslint', // dev dependency
    'eslint-config-prettier', // dev dependency
    '@commitlint/cli', // dev dependency
    '@commitlint/config-conventional', // dev dependency
    '@babel/core', // dev dependency
    '@babel/preset-env', // dev dependency
    '@babel/preset-react', // dev dependency
    '@babel/preset-typescript', // dev dependency
    'babel-jest', // dev dependency
    'jest-junit', // dev dependency
    'pm2', // dev dependency
    'pino-pretty', // dev dependency
    'wait-on', // dev dependency
    '@types/express', // dev dependency
    'ts-jest', // dev dependency
    '@types/spotify-api', // dev dependency, used in spotifyPolling.ts
    '@faker-js/faker', // dev dependency
    'msw-storybook-addon', // dev dependency
    'eslint-plugin-react', // dev dependency
    'eslint-plugin-react-hooks', // dev dependency
    'eslint-plugin-jsx-a11y', // dev dependency
    '@typescript-eslint/eslint-plugin', // dev dependency
    '@typescript-eslint/parser', // dev dependency
    'happy-dom', // dev dependency
    'jest-canvas-mock', // dev dependency
    'jest-specific-snapshot', // dev dependency
    'next-router-mock', // dev dependency
    'resize-observer-polyfill', // dev dependency
    'whatwg-fetch', // dev dependency
  ],
  ignoreBinaries: ['npx', 'pm2'],
}

export default config
