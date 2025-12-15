import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  use: {
    baseURL: 'http://localhost:3005',
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: path.resolve(__dirname, '.env.local'),
    },
  },
})
