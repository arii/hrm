// jest.config.shared.cjs
module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/tests/unit'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  transform: {
    '^.+\\.mjs$': 'babel-jest',
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ES2022',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid|@asteasolutions/zod-to-openapi|cheerio|@markw65/fit-file-writer)',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@markw65/fit-file-writer$':
      '<rootDir>/tests/unit/mocks/fit-file-writer.ts',
  },
  testTimeout: 10000,
}
