/**
 * @jest-environment node
 */
import { POST } from '@/app/api/users/route'
import { NextRequest } from 'next/server'
import { createValidUserProfile } from '@/tests/unit/test-data/user-data-factory'

// Mock the 'uuid' module
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-v4',
}))

describe('API Route: /api/users', () => {
  describe('POST', () => {
    it('should create a new user and return 201 when the request body is valid', async () => {
      // Arrange
      const validRequestBody = createValidUserProfile()
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request, { params: {} })
      const newUser = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(newUser.id).toBe('mock-uuid-v4')
      expect(newUser).toHaveProperty('createdAt')
      expect(newUser).toHaveProperty('updatedAt')
      expect(newUser.username).toBe(validRequestBody.username)
      expect(newUser.email).toBe(validRequestBody.email)
    })

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidRequestBody = {
        // 'username' and 'email' are missing
        firstName: 'Jane',
        lastName: 'Doe',
      }
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request, { params: {} })
      const errorData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(errorData).toHaveProperty('errors')
      expect(Array.isArray(errorData.errors)).toBe(true)
      expect(errorData.errors.length).toBeGreaterThan(0)
    })

    it('should return 400 for data that does not meet schema constraints', async () => {
      // Arrange
      const invalidRequestBody = createValidUserProfile({
        username: 'jo', // Too short
        email: 'not-an-email',
      })
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request, { params: {} })
      const errorData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(errorData).toHaveProperty('errors')
      expect(Array.isArray(errorData.errors)).toBe(true)
      // Expecting errors for both username and email
      expect(errorData.errors.length).toBe(2)
    })
  })
})
