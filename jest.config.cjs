/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
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
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          allowJs: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    // recharts is mocked, so it doesn't need to be explicitly transformed or ignored from transformation.
    '/node_modules/(?!.pnpm|uuid|@asteasolutions/zod-to-openapi|@garmin/fitsdk)',
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

module.exports = config
