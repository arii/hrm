// utils/config.ts

interface Config {
  env: 'development' | 'production' | 'test'
  port: number
  hostname: string
  wsUrl: string
  baseURL: string
  nextAuthSecret: string
  isTest: boolean
  isDev: boolean
}

const env = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
const isTest = env === 'test'
const isDev = env === 'development'

// Use a dynamic port in test environments to avoid conflicts during parallel runs
const port = isTest ? 0 : process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

const hostname =
  process.env.NODE_ENV === 'production'
    ? '0.0.0.0'
    : process.env.HOST || '127.0.0.1'

// The canonical base URL for the application. Essential for OAuth callbacks and consistent routing.
// It should be set via NEXTAUTH_URL in production.
const baseURL = process.env.NEXTAUTH_URL || `http://${hostname}:${port}`

// The WebSocket URL for server-side logic (internal use)
const wsUrl = `ws://${hostname}:${port}/ws`

const config: Config = {
  env,
  port,
  hostname,
  baseURL,
  wsUrl,
  nextAuthSecret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev',
  isTest,
  isDev,
}

export default config
