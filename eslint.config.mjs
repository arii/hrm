import js from '@eslint/js'
import nextPlugin from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // Apply recommended ESLint JavaScript rules
  js.configs.recommended,

  // Explicitly ignore unused variables starting with '_'
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Apply recommended TypeScript ESLint rules
  ...tseslint.configs.recommended,

  // Next.js specific rules and configurations
  ...nextPlugin, // Extends the core-web-vitals configuration from eslint-config-next
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // You can override or add Next.js specific rules here
      // For example:
      // '@next/next/no-html-link-for-pages': 'off',
    },
  },

  // Ignore files and directories
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/',
    'dist/**', // Exclude compiled output
    'server.js', // Exclude server.js
    '~/.config/chrome-debug-profile/**', // Exclude chrome debug profile files
    '.github/copilot-instructions.md', // Exclude copilot instructions
    'ecosystem.config.cjs', // Exclude PM2 config file
  ]),

  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json', // Adjust if your tsconfig.json is elsewhere
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // TypeScript specific rules
      // For example, to prevent unused variables:
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // Override for Playwright test files
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/playwright/tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Playwright specific rules or overrides
    },
  },

  // Override for services files to ignore unused 'fetch' import and other service-related imports/constants
  {
    files: ['services/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern:
            '^fetch$|^SpotifyData$|^UnifiedStateMessage$|^SpotifyTokenManager$|^TOKEN_URL$|^SpotifyTokenResponse$',
        },
      ],
    },
  },
  // This turns off any ESLint style rules that conflict with Prettier.
  prettierConfig,
])
