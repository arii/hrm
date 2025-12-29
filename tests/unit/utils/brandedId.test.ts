// tests/unit/utils/brandedId.test.ts
import { generateClientId, toClientId } from '../../../utils/brandedId'
import { ZodError } from 'zod'

describe('brandedId', () => {
  describe('generateClientId', () => {
    it('should generate a ClientId with the correct prefix', () => {
      const clientId = generateClientId()
      expect(clientId).toMatch(/^user-/)
    })

    it('should generate a unique ClientId on each call', () => {
      const clientId1 = generateClientId()
      const clientId2 = generateClientId()
      expect(clientId1).not.toEqual(clientId2)
    })
  })

  describe('toClientId', () => {
    it('should correctly cast a valid string to a ClientId', () => {
      const id = 'user-12345'
      const clientId = toClientId(id)
      expect(clientId).toEqual(id)
    })

    it('should throw a ZodError if the string is empty', () => {
      expect(() => toClientId('')).toThrow(ZodError)
    })
  })
})
