/** @type {import('jest').Config} */
const config = {
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
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid|@asteasolutions/zod-to-openapi)',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/unit/jest.setup.js'],
}

module.exports = config
