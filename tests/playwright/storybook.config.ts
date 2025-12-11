// tests/playwright/storybook.config.ts
import { defineConfig } from '@playwright/test'

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: /storybook\.spec\.ts$/,
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:6006',
    trace: 'on-first-retry',
  },
})
