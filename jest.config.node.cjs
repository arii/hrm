// jest.config.node.cjs
const sharedConfig = require('./jest.config.shared.cjs')

module.exports = {
  ...sharedConfig,
  displayName: 'node',
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/app/api/**/*.test.ts',
    '**/tests/unit/lib/export/**/*.test.ts',
    '**/tests/unit/lib/validation/**/*.test.ts',
    '**/tests/unit/services/**/*.test.ts',
    '**/tests/unit/utils/**/*.test.ts',
    '**/tests/unit/scripts/**/*.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/unit/jest.setup.js'],
}
