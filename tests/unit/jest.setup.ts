// tests/unit/jest.setup.ts
import { jest } from '@jest/globals'

jest.mock('@/lib/db', () => ({
  db: {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))
