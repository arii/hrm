// jest.config.cjs
module.exports = {
  projects: ['<rootDir>/jest.config.node.cjs', '<rootDir>/jest.config.jsdom.cjs'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.ts',
    'utils/socketManager.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
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
}
