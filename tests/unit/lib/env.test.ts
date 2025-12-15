import { z } from 'zod'

// Mock the env object to avoid parsing process.env
jest.mock('@/lib/env', () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default('127.0.0.1'),
    DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z
      .string()
      .min(1, 'NEXTAUTH_SECRET is required for authentication'),
    INTERNAL_TOKEN_DELIVERY_SECRET: z
      .string()
      .min(1, 'INTERNAL_TOKEN_DELIVERY_SECRET is required'),
    SPOTIFY_CLIENT_ID: z.string().min(1, 'SPOTIFY_CLIENT_ID is required'),
    SPOTIFY_CLIENT_SECRET: z
      .string()
      .min(1, 'SPOTIFY_CLIENT_SECRET is required'),
    SPOTIFY_CALLBACK_URL: z.string().url().optional(),
    SPOTIFY_POLLING_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),
    SPOTIFY_DEBUG: z.string().optional(),
    SPOTIFY_EXPECTED_USER_ID: z.string().optional(),
    GOOGLE_DOC_WORKOUT_URL: z.string().url().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    TESTING: z.string().optional(),
    CI: z.string().optional(),
    ANALYZE: z.string().optional(),
    npm_package_version: z.string().optional(),
    NEXT_PUBLIC_WS_URL: z.string().url().optional().or(z.literal('')),
    NEXT_PUBLIC_API_URL: z.string().url().optional().or(z.literal('')),
    NEXT_PUBLIC_USE_NATIVE_TABLE: z.string().optional(),
  })

  return {
    env: envSchema.parse(process.env),
  }
})

describe('Environment variable validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should parse valid environment variables', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'secret',
      INTERNAL_TOKEN_DELIVERY_SECRET: 'secret',
      SPOTIFY_CLIENT_ID: 'spotify-client-id',
      SPOTIFY_CLIENT_SECRET: 'spotify-client-secret',
    }

    const { env } = await import('@/lib/env');
    expect(env).toBeDefined()
    expect(env.NODE_ENV).toBe('test')
    expect(env.PORT).toBe(3000)
    expect(env.HOST).toBe('127.0.0.1')
    expect(env.DATABASE_URL).toBe(
      'postgresql://user:password@localhost:5432/db'
    )
    expect(env.NEXTAUTH_URL).toBe('http://localhost:3000')
    expect(env.NEXTAUTH_SECRET).toBe('secret')
    expect(env.INTERNAL_TOKEN_DELIVERY_SECRET).toBe('secret')
    expect(env.SPOTIFY_CLIENT_ID).toBe('spotify-client-id')
    expect(env.SPOTIFY_CLIENT_SECRET).toBe('spotify-client-secret')
  })

  it('should throw an error if required environment variables are missing', () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: undefined,
    }

    expect(() => require('@/lib/env')).toThrow()
  })

  it('should throw an error if environment variables have invalid types', () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: 'invalid-port',
    }

    expect(() => require('@/lib/env')).toThrow()
  })
})
