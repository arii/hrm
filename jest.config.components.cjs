/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/unit/components', '<rootDir>/tests/unit/hooks'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx|js|mjs)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          allowJs: true, // transpile ESM-only packages (uuid, he) from node_modules
        },
      },
    ],
  },
  // pnpm nests packages under node_modules/.pnpm/<name>@<ver>/node_modules/<name>.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/)?(uuid|he[@/]|@asteasolutions[/+]zod-to-openapi|@garmin[/+]fitsdk))',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest-setup.js',
    '<rootDir>/tests/unit/jest.setup.js',
  ],
}

module.exports = config
