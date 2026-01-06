// jest.config.jsdom.cjs
const sharedConfig = require('./jest.config.shared.cjs')

module.exports = {
  ...sharedConfig,
  displayName: 'jsdom',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/unit/components/**/*.test.tsx',
    '**/tests/unit/hooks/**/*.test.ts',
    '**/tests/unit/context/**/*.test.tsx',
    '**/tests/unit/lib/calorie-estimation.test.ts',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/unit/jest.setup.js',
    '<rootDir>/tests/unit/mocks/localStorage.ts',
  ],
}
