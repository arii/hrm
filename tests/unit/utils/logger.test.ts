// tests/unit/utils/logger.test.ts

describe('Client Logger', () => {
  afterEach(() => {
    jest.resetModules()
  })

  it('should create a client-side logger', () => {
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    })

    import('../../../utils/logger').then((module) => {
      const logger = module.default
      expect(logger.info).toBe(console.info)
    })
  })

  it('should return a mock httpLogger', () => {
    import('../../../utils/logger').then((module) => {
      const { httpLogger } = module
      const next = jest.fn()
      httpLogger({}, {}, next)
      expect(next).toHaveBeenCalled()
    })
  })
})
