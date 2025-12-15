// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

export default [
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
  ...compat.extends('next/core-web-vitals').map((config) => ({
    ...config,
    rules: {
      ...config.rules,
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  })),

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
  {
    ignores: [
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
    ],
  },

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
      globals: {
        React: 'readonly',
        NodeJS: 'readonly',
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
    files: ['tests/playwright/**/*.ts'],
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
      // Disable react-hooks/rules-of-hooks for Playwright fixtures (use() is not a React hook)
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Override for Jest unit test files
  {
    files: ['tests/unit/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/unit/tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        NodeJS: 'readonly',
      },
    },
    rules: {
      // Jest specific rules or overrides
    },
  },

  // Override for Jest integration test files
  {
    files: ['tests/integration/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/integration/tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
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
]
