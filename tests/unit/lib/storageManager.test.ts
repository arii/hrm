/**
 * @jest-environment jsdom
 */
import storageManager from '../../../lib/storageManager'
import Cookies from 'js-cookie'

// Mocking js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

describe('StorageManager', () => {
  const testKey = 'test-key'
  const testValue = { foo: 'bar' }
  const testStringValue = 'test-string'

  beforeEach(() => {
    // Clear all mocks before each test
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('localStorage', () => {
    it('should set and get an object from localStorage', () => {
      storageManager.set(testKey, testValue)
      const result = storageManager.get(testKey)
      expect(result).toEqual(testValue)
    })

    it('should set and get a string from localStorage', () => {
      storageManager.set(testKey, testStringValue)
      const result = storageManager.get(testKey)
      expect(result).toEqual(testStringValue)
    })

    it('should return null for a non-existent key from localStorage', () => {
      const result = storageManager.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should remove a key from localStorage', () => {
      storageManager.set(testKey, testValue)
      storageManager.remove(testKey)
      const result = storageManager.get(testKey)
      expect(result).toBeNull()
    })

    it('should handle errors when parsing invalid JSON from localStorage', () => {
      localStorage.setItem(testKey, '{invalid-json')
      const result = storageManager.get(testKey)
      expect(result).toBeNull()
    })
  })

  describe('cookies', () => {
    it('should set and get an object from cookies', () => {
      ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(testValue))
      storageManager.setCookie(testKey, testValue)
      const result = storageManager.getCookie(testKey)
      expect(Cookies.set).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testValue),
        undefined
      )
      expect(result).toEqual(testValue)
    })

    it('should set and get a string from cookies', () => {
      ;(Cookies.get as jest.Mock).mockReturnValue(
        JSON.stringify(testStringValue)
      )
      storageManager.setCookie(testKey, testStringValue)
      const result = storageManager.getCookie(testKey)
      expect(Cookies.set).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(testStringValue),
        undefined
      )
      expect(result).toEqual(testStringValue)
    })

    it('should return null for a non-existent key from cookies', () => {
      ;(Cookies.get as jest.Mock).mockReturnValue(undefined)
      const result = storageManager.getCookie('non-existent-key')
      expect(result).toBeNull()
    })

    it('should remove a key from cookies', () => {
      storageManager.removeCookie(testKey)
      expect(Cookies.remove).toHaveBeenCalledWith(testKey, undefined)
    })

    it('should handle errors when parsing invalid JSON from cookies', () => {
      ;(Cookies.get as jest.Mock).mockReturnValue('{invalid-json')
      const result = storageManager.getCookie(testKey)
      expect(result).toBeNull()
    })
  })
})
