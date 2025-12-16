/**
 * @jest-environment jsdom
 */
import {
  toISO8601,
  toUnixTimestamp,
  nowAsISO,
  nowAsUnix,
} from '@/lib/shared/utils/date'

describe('date utilities', () => {
  const mockDate = new Date('2023-10-27T10:00:00.000Z')
  const mockTimestamp = mockDate.getTime()
  const mockISOString = '2023-10-27T10:00:00.000Z'

  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('should convert a Date object to an ISO 8601 string', () => {
    expect(toISO8601(mockDate)).toBe(mockISOString)
  })

  it('should convert a Unix epoch timestamp to an ISO 8601 string', () => {
    expect(toISO8601(mockTimestamp)).toBe(mockISOString)
  })

  it('should convert an ISO 8601 string to a Unix epoch timestamp', () => {
    expect(toUnixTimestamp(mockISOString)).toBe(mockTimestamp)
  })

  it('should get the current time as an ISO 8601 string', () => {
    expect(nowAsISO()).toBe(mockISOString)
  })

  it('should get the current time as a Unix epoch timestamp', () => {
    expect(nowAsUnix()).toBe(mockTimestamp)
  })
})
