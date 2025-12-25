import js from '@eslint/js'
import nextPlugin from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // 1. GLOBAL IGNORES
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/test-recordings/**',
      '**/logs/**',
      '**/*.min.js',
      '**/*.d.ts',
      'next-env.d.ts',
      'server.js',
      'ecosystem.config.cjs',
      '**/.config/chrome-debug-profile/**',
      '.github/copilot-instructions.md',
      'tests/unit/jest.setup.js',
    ],
  },

  // 2. Base Configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Next.js Configuration
  ...nextPlugin,

  // 4. Custom Rules: General Variables
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

  // 5. TypeScript Specific Settings
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // 6. Test Overrides
  {
    files: ['tests/playwright/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/playwright/tsconfig.json',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['tests/unit/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/unit/tsconfig.json',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    files: ['tests/integration/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/integration/tsconfig.json',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // 7. Services Override (Specific Ignores)
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

  // 8. Prettier Config (Must be last to override conflicting rules)
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  {
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },
])
