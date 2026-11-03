import js from '@eslint/js'
import nextPlugin from 'eslint-config-next/core-web-vitals'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react' // Explicitly import the React plugin
import unusedImports from 'eslint-plugin-unused-imports'

export default defineConfig([
  // 1. GLOBAL IGNORES
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/logs/**',
      'ecosystem.config.cjs',
      'next-env.d.ts',
      'tests/unit/jest.setup.js',
      'pnpm-lock.yaml',
    ],
  },

  // 2. Base Configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Next.js Configuration (includes React/React Hooks rules)
  ...nextPlugin,

  // 4. Explicit React Configuration for Clarity
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with Next.js App Router
      'react/prop-types': 'off', // Not needed for TypeScript projects
    },
  },

  // 5. Custom Rules: General Variables & Formatting
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // This rule is not purely stylistic and helps prevent VCS noise.
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

  // 6. TypeScript Specific Settings
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

  // 7. Test Overrides
  {
    files: ['tests/playwright/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tests/playwright/tsconfig.json',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off', // Playwright's use() fixture is not a hook
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

  // 8. Services Override (Specific Ignores)
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

  // 8.5 Architectural Boundaries (#9707 A3). Transport and server-only
  // modules must never be imported by UI components. Each message states
  // why, where the logic belongs, and the doc section. Exceptions require
  // an inline eslint-disable justification plus the PR approval label.
  {
    files: ['components/**', '**/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'ws',
              message:
                'Forbidden: raw socket transport in components crashes/bloats the client bundle. Move socket I/O to WebSocketContext/context adapters or hooks/ and subscribe via useWebSocket(). See docs/ARCHITECTURE_DECISIONS.md "Client/Server Module Boundaries".',
            },
            {
              name: '@/utils/socketManager',
              message:
                'Forbidden: server socket manager in components. Use useWebSocket() from @/context/WebSocketContext instead. See docs/ARCHITECTURE_DECISIONS.md "Client/Server Module Boundaries".',
            },
            {
              name: '@/utils/websocketUtils',
              message:
                'Forbidden: socket helpers in components. Move transport logic to context adapters or hooks/. See docs/ARCHITECTURE_DECISIONS.md "Client/Server Module Boundaries".',
            },
            {
              name: '@/utils/logger.server',
              message:
                'Forbidden: server-only logger (pino/filesystem) in components. Use @/utils/logger instead. See docs/ARCHITECTURE_DECISIONS.md "Client/Server Module Boundaries".',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='WebSocket']",
          message:
            'Forbidden: direct WebSocket construction in components bypasses reconnect/watchdog ownership. Use useWebSocket() from @/context/WebSocketContext instead. See docs/ARCHITECTURE_DECISIONS.md "Client/Server Module Boundaries".',
        },
      ],
    },
  },

  // 9. Prettier Config (Must be last to override conflicting rules)
  // This disables ESLint's stylistic rules in favor of Prettier.
  // Code formatting is enforced via a pre-commit hook using lint-staged.
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
