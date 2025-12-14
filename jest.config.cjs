/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'server',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'client',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/unit/client/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/tests/unit/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results', // The directory where the XML file will be saved
        outputName: 'unit-results.xml', // The name of the JUnit XML file
        suiteNameTemplate: '{filepath}', // Optional: customize the suite name
        classNameTemplate: '{classname}', // Optional: customize the class name
        titleTemplate: '{title}', // Optional: customize the test title
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
    '^.+\\.mjs$': 'babel-jest', // Added to handle .mjs files if any
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler', // bundler is a better choice for modern apps
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)', // Ensure uuid is transformed
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
}

module.exports = config
