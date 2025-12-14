// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import nextPlugin from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'

export default defineConfig([
  // Apply recommended ESLint JavaScript rules
  js.configs.recommended,

  // Apply recommended TypeScript ESLint rules
  ...tseslint.configs.recommended,

  // Apply recommended React rules, including the new JSX runtime
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },

  // Configure JavaScript unused vars to work with TypeScript
  {
    rules: {
      'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors with TypeScript
    },
  },

  // Next.js specific rules and configurations (includes TypeScript support)
  ...nextPlugin, // Extends the core-web-vitals configuration from eslint-config-next

  // Apply TypeScript rules without redefining the plugin
  {
    rules: {
      // Explicitly ignore unused variables starting with '_'
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Configure trailing comma rules for consistent code formatting
      '@typescript-eslint/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
    },
  },
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
    'dist/**',
    '.vscode/**',
  ]),

  // Base TypeScript configuration using the root tsconfig.json
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json', // Unified tsconfig
      },
    },
    rules: {
      // TypeScript-specific rules can be added here
    },
  },

  // Override for Jest test files to add Jest globals
  {
    files: ['tests/unit/**/*.{ts,tsx}', 'tests/integration/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        NodeJS: 'readonly',
      },
    },
    rules: {
      // Jest specific rules or overrides
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

  // Add the Prettier plugin configuration
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // Restrict console statements in production
  {
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },
])
