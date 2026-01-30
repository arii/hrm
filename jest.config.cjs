/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/tests/unit/hooks/**/*.test.ts',
        '**/tests/unit/app/client/**/*.test.tsx'
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
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
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.js', '<rootDir>/tests/unit/jest.setup.js'],
    },
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '**/tests/unit/**/*.test.ts',
        '!**/tests/unit/hooks/**/*.test.ts',
        '!**/tests/unit/app/client/**/*.test.tsx'
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      transform: {
        '^.+\\\\.mjs$': 'babel-jest',
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
      transformIgnorePatterns: [
        '/node_modules/(?!uuid|@asteasolutions/zod-to-openapi)',
      ],
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/$1',
        '^recharts$': '<rootDir>/tests/__mocks__/recharts.tsx',
      },
      testTimeout: 10000,
      setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.js', '<rootDir>/tests/unit/jest.setup.js'],
    },
  ],
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
};

module.exports = config;
