// jest.config.cjs

// Common configuration for all projects
const commonConfig = {
  preset: 'ts-jest',
  roots: ['<rootDir>/tests/unit'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'unit-results.xml',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  collectCoverageFrom: [
    'services/**/*.ts',
    'utils/socketManager.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  transform: {
    '^.+\\.mjs$': 'babel-jest',
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
}

/** @type {import('jest').Config} */
const config = {
  projects: [
    // Project for React Components & Hooks (.tsx files) -> jsdom environment
    {
      ...commonConfig,
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['**/*.test.tsx'],
    },
    // Project for API Routes & Services (.ts files) -> node environment
    {
      ...commonConfig,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
    },
  ],
}

// eslint-disable-next-line no-undef
module.exports = config
