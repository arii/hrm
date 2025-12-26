import { defineConfig } from '@playwright/experimental-ct-react'

export default defineConfig({
  testDir: './tests/unit/components',
  testMatch: /.*\.ct\.test\.tsx/,
  snapshotDir: './tests/unit/components/__snapshots__',
  use: {
    trace: 'on-first-retry',
    ctViteConfig: {
      configFile: 'vite.config.components.ts',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 500, height: 500 },
      },
    },
  ],
})
