// tests/unit/utils/brandedId.test.ts
import { generateClientId, toClientId } from '../../../utils/brandedId'
import { ClientId } from '../../../types/branded'

describe('brandedId utilities', () => {
  describe('generateClientId', () => {
    it('should generate a ClientId that starts with "user-"', () => {
      const clientId = generateClientId()
      expect(clientId.startsWith('user-')).toBe(true)
    })

    it('should generate a unique ClientId each time', () => {
      const clientId1 = generateClientId()
      const clientId2 = generateClientId()
      expect(clientId1).not.toBe(clientId2)
    })
  })

  describe('toClientId', () => {
    it('should cast a string to a ClientId', () => {
      const id = 'test-id'
      const clientId = toClientId(id)
      expect(clientId).toBe(id)
    })

    it('should return a value that can be assigned to a ClientId variable', () => {
      const id = 'test-id'
      const clientId: ClientId = toClientId(id)
      expect(clientId).toBe(id)
    })
  })
})
