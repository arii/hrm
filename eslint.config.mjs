// eslint.config.mjs
import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import reactPlugin from 'eslint-plugin-react'
import hooksPlugin from 'eslint-plugin-react-hooks'
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

export default [
  // Apply recommended ESLint JavaScript rules
  js.configs.recommended,

  // Apply recommended TypeScript ESLint rules
  ...tseslint.configs.recommended,

  // React, Hooks, and a11y recommended rules
  {
    ...reactPlugin.configs.flat.recommended,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Correctly configure the react-hooks plugin for flat config
    plugins: {
      'react-hooks': hooksPlugin,
    },
    rules: hooksPlugin.configs.recommended.rules,
  },
  // Use the correct flat config export for jsx-a11y
  jsxA11yPlugin.flatConfigs.recommended,

  // Configure JavaScript unused vars to work with TypeScript
  {
    rules: {
      'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors with TypeScript
    },
  },

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
    rules: {},
  },

  // Override for Storybook files to disable prop-types
  {
    files: ['**/*.stories.tsx'],
    rules: {
      'react/prop-types': 'off',
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
      'react/react-in-jsx-scope': 'off',
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
