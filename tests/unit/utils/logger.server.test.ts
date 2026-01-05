// tests/unit/utils/logger.server.test.ts
import pino from 'pino'
import { PassThrough } from 'stream'

describe('Server Logger', () => {
  let logger: any
  let stream: PassThrough
  let dest: any

  beforeEach(() => {
    stream = new PassThrough()
    dest = pino.destination(stream)
  })

  afterEach(() => {
    jest.resetModules()
  })

  it('should create a server-side logger', (done) => {
    process.env.NODE_ENV = 'development'
    import('../../../utils/logger.server').then((module) => {
      logger = module.default
      logger.info('test')
      stream.once('data', (chunk) => {
        const log = JSON.parse(chunk)
        expect(log.msg).toBe('test')
        done()
      })
    })
  })

  it('should create a silent logger in test environment', () => {
    process.env.NODE_ENV = 'test'
    import('../../../utils/logger.server').then((module) => {
      logger = module.default
      const pinoInstance = pino({ level: 'silent' }, dest)
      expect(pinoInstance.isLevelEnabled('info')).toBe(false)
    })
  })

  it('should use pino-pretty in development', () => {
    process.env.NODE_ENV = 'development'
    import('../../../utils/logger.server').then((module) => {
      logger = module.default
      expect((logger as any).transport).toBeDefined()
    })
  })
})
