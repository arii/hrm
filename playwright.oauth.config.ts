// @ts-nocheck
import { defineConfig } from '@playwright/test'
import config from './utils/config'

export default defineConfig({
  testDir: './tests/playwright/oauth',
  use: {
    baseURL: config.baseURL,
  },
})
