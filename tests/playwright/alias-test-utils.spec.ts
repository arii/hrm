import { test, expect } from '@playwright/test'
import { getWebSocketURL } from '@/utils/urls'

test('alias resolution utils', async () => {
  console.log('getWebSocketURL:', getWebSocketURL)
  expect(getWebSocketURL).toBeDefined()
})
