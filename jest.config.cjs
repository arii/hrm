/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
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
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/app/api/**/*.test.ts',
        '<rootDir>/tests/unit/lib/**/*.test.ts',
        '<rootDir>/tests/unit/services/**/*.test.ts',
        '<rootDir>/tests/unit/utils/**/*.test.ts',
        '<rootDir>/tests/unit/socketManager.test.ts',
        '<rootDir>/tests/unit/spotifyPolling.test.ts',
        '<rootDir>/tests/unit/tabataTimer.test.ts',
        '<rootDir>/tests/unit/services.test.ts',
      ],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/unit/components/**/*.test.tsx',
        '<rootDir>/tests/unit/app/client/**/*.test.tsx',
        '<rootDir>/tests/unit/context/**/*.test.tsx',
        '<rootDir>/tests/unit/hooks/**/*.test.tsx',
        '<rootDir>/tests/unit/AuthButton.test.tsx',
        '<rootDir>/tests/unit/TimerControls.test.tsx',
        '<rootDir>/tests/unit/useBluetoothHRM.test.ts',
        '<rootDir>/tests/unit/useVolumePreference.test.ts',
      ],
    },
  ],
}

module.exports = config
