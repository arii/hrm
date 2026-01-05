/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-github-reporter',
      {
        repository: process.env.GITHUB_REPOSITORY,
        runId: process.env.GITHUB_RUN_ID,
        githubToken: process.env.GITHUB_TOKEN,
        jobName: process.env.GITHUB_JOB,
      },
    ],
  ],
  collectCoverageFrom: [
    '**/src/**/*.{js,ts,tsx}',
    '**/services/**/*.{js,ts,tsx}',
    '**/utils/**/*.{js,ts,tsx}',
    '**/lib/**/*.{js,ts,tsx}',
    '**/hooks/**/*.{js,ts,tsx}',
    '**/app/**/*.{js,ts,tsx}',
    '**/components/**/*.{js,ts,tsx}',
    '!**/node_modules/**',
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'babel-jest',
      {
        presets: [
          [
            '@babel/preset-env',
            { targets: { node: 'current' }, modules: 'commonjs' },
          ],
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
