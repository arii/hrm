import connectionLogger, {
  clearConnectionLog,
  formatConnectionLog,
  recordConnectionEvent,
  TAB_ID,
} from '@/hooks/useBluetoothHRM/connectionLog'
import baseLogger from '@/utils/logger'

jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('connection log', () => {
  beforeEach(() => clearConnectionLog())

  it('records both logger call shapes, timestamped, and still logs to the console', () => {
    connectionLogger.info('Plain message')
    connectionLogger.error(
      { device: 'HR6', error: new Error('GATT Server is disconnected') },
      'GATT Connection failed'
    )

    expect(baseLogger.info).toHaveBeenCalledWith('Plain message')
    const lines = formatConnectionLog().split('\n')
    expect(lines[0]).toBe(`HRM connection log, tab ${TAB_ID}`)
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z INFO Plain message$/),
        expect.stringMatching(
          /ERROR GATT Connection failed \{"device":"HR6","error":\{"name":"Error","message":"GATT Server is disconnected"\}\}$/
        ),
      ])
    )
  })

  it('keeps debug chatter out and caps its size', () => {
    connectionLogger.debug('per-packet noise')
    for (let i = 0; i < 400; i++) recordConnectionEvent('info', `event ${i}`)
    const log = formatConnectionLog()
    expect(log).not.toContain('per-packet noise')
    expect(log).not.toContain('event 99\n')
    expect(log).toContain('event 399')
    expect(log.split('\n').filter((l) => l.includes(' INFO '))).toHaveLength(
      300
    )
  })
})
