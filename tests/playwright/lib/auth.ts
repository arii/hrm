// @ts-nocheck
import { test, expect } from '@playwright/test'
import config from '../../../utils/config'

test.describe('Auth Utilities', () => {
  test('should be defined', () => {
    expect(config.baseURL).toBeDefined()
  })
})
