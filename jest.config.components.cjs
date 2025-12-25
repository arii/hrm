// jest.config.components.cjs
const baseConfig = require('./jest.config.cjs')

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'components',
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/components/**/*.test.[jt]s?(x)'],
  // Add component-specific setup files if needed
  // setupFilesAfterEnv: ['./tests/setup/components.ts'],
}

module.exports = config
