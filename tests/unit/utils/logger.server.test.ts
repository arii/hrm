// tests/unit/utils/logger.server.test.ts
import { pinoOptions } from '@/utils/logger.server'

describe('Server Logger Configuration', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it("should set log level to 'silent' when NODE_ENV is 'test'", () => {
    process.env.NODE_ENV = 'test'
    const options = require('@/utils/logger.server').pinoOptions
    expect(options.level).toBe('silent')
  })

  it("should set log level to 'info' when NODE_ENV is 'production'", () => {
    process.env.NODE_ENV = 'production'
    const options = require('@/utils/logger.server').pinoOptions
    expect(options.level).toBe('info')
  })

  it("should set log level to 'debug' when NODE_ENV is 'development'", () => {
    process.env.NODE_ENV = 'development'
    const options = require('@/utils/logger.server').pinoOptions
    expect(options.level).toBe('debug')
  })

  it('should override the log level with LOG_LEVEL environment variable', () => {
    process.env.NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'warn'
    const options = require('@/utils/logger.server').pinoOptions
    expect(options.level).toBe('warn')
  })
})
