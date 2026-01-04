const { defaultsESM: tsjPreset } = require('ts-jest/presets')

/** @type {import('jest').Config} */
const config = {
  ...tsjPreset,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
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
    ...tsjPreset.transform,
    '^.+\\.mtsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    ...tsjPreset.moduleNameMapper,
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/unit/jest.setup.js'],
}

module.exports = config
