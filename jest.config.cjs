/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/tests/integration'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: "coverage",
  reporters : ["default", 
    [
      "jest-junit",
      {
        outputDirectory: "./test-results", // The directory where the XML file will be saved
        outputName: "unit-results.xml", // The name of the JUnit XML file
        suiteNameTemplate: "{filepath}", // Optional: customize the suite name
        classNameTemplate: "{classname}", // Optional: customize the class name
        titleTemplate: "{title}", // Optional: customize the test title
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
  maxWorkers: 1,
  globalSetup: '<rootDir>/tests/integration/jest.global-setup.js',
}

module.exports = config
