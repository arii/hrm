import { test, expect } from '@playwright/test'
import { HRM_ROUTES } from '@/tests/playwright/lib/setup'

test('alias resolution', async () => {
  console.log('HRM_ROUTES:', HRM_ROUTES)
  expect(HRM_ROUTES).toBeDefined()
})
