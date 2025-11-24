/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed to jsdom for React components
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Setup files for React Testing Library
  setupFilesAfterEnv: ['<rootDir>/tests/utils/testSetup.ts'],
  
  // Performance Optimizations
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  
  // Expanded Coverage Configuration
  collectCoverageFrom: [
    'services/**/*.ts',
    'utils/socketManager.ts',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.ts',
    'app/api/**/*.ts',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.stories.{ts,tsx}',
    '!**/*.config.{ts,js}',
    '!**/layout.tsx', // Exclude layout files
    '!**/page.tsx', // Exclude page files (tested via E2E)
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,   // Increased from 60
      functions: 80,   // Increased from 70
      lines: 80,       // Increased from 70
      statements: 80,  // Increased from 70
    },
    // Component-specific thresholds
    'components/**/*.{ts,tsx}': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // API-specific thresholds  
    'app/api/**/*.ts': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // Transform Configuration (Optimized)
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          jsx: 'react-jsx', // Added for React support
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    // Mock CSS imports for components
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Faster test execution
  testTimeout: 8000,
  maxConcurrency: 5,
  
  // Watch mode optimizations
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/playwright-report/',
    '<rootDir>/test-results/',
  ],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
}

module.exports = config
