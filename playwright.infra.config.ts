// playwright.infra.config.ts
import { defineConfig } from '@playwright/test'
import defaultConfig from './playwright.config'

// Remove the webServer config for infrastructure tests
const { webServer, ...infraConfig } = defaultConfig

export default defineConfig(infraConfig)
