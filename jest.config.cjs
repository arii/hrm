/** @type {import('jest').Config} */

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
          jsx: 'react-jsx',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid|@asteasolutions/zod-to-openapi|cheerio)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^recharts$': '<rootDir>/tests/__mocks__/recharts.tsx',
  },
  testTimeout: 10000,
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest-setup.js',
    '<rootDir>/tests/unit/jest.setup.js',
  ],
}

module.exports = {
  projects: [
    {
      ...commonConfig,
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/app/api/**/*.test.ts',
        '<rootDir>/tests/unit/services/**/*.test.ts',
        '<rootDir>/tests/unit/lib/**/*.test.ts',
        '<rootDir>/tests/unit/scripts/**/*.test.ts',
        '<rootDir>/tests/unit/gemini-client.test.ts',
        '<rootDir>/tests/unit/safeSpotifyApi.test.ts',
        '<rootDir>/tests/unit/services.test.ts',
        '<rootDir>/tests/unit/spotifyPolling.test.ts',
      ],
    },
    {
      ...commonConfig,
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/unit/components/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/hooks/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/context/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/app/client/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/utils/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/constants/**/*.test.{ts,tsx}',
        '<rootDir>/tests/unit/useVolumePreference.test.ts',
        '<rootDir>/tests/unit/socketManager.test.ts',
        '<rootDir>/tests/unit/websocketUtils.test.ts',
      ],
    },
  ],
}
