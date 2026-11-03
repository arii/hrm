/**
 * @jest-environment jsdom
 */
import { generateClientId } from '@/utils/clientId'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('generateClientId', () => {
  const realRandomUUID = window.crypto.randomUUID

  afterEach(() => {
    // Restore even if a test deleted the function.
    Object.defineProperty(window.crypto, 'randomUUID', {
      value: realRandomUUID,
      writable: true,
      configurable: true,
    })
  })

  it('returns a UUIDv4 from the native API when available', () => {
    expect(generateClientId()).toMatch(UUID_V4)
  })

  it('falls back to a UUIDv4 when randomUUID is missing (insecure http origin)', () => {
    // Simulate a non-secure context where randomUUID is undefined.
    Object.defineProperty(window.crypto, 'randomUUID', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    const first = generateClientId()
    const second = generateClientId()
    expect(first).toMatch(UUID_V4)
    expect(second).toMatch(UUID_V4)
    expect(first).not.toBe(second)
  })
})
