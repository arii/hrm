/**
 * @jest-environment node
 */
import { POST } from '@/app/api/users/route'
import { NextRequest } from 'next/server'
import { createValidUserProfile } from '@/tests/unit/test-data/user-data-factory'
import * as csrf from '@/lib/csrf'

// Mock the 'uuid' module
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-v4',
}))

// Mock the CSRF module
jest.mock('@/lib/csrf')
const mockedCsrf = jest.mocked(csrf)

describe('API Route: /api/users', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })
  describe('POST', () => {
    it('should return 403 if CSRF token is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.message).toBe('Forbidden: CSRF token missing')
    })

    it('should return 403 if CSRF token is invalid', async () => {
      // Arrange
      mockedCsrf.validateCsrfToken.mockReturnValue(false)
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'invalid-token',
        },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.message).toBe('Forbidden: Invalid CSRF token')
      expect(mockedCsrf.validateCsrfToken).toHaveBeenCalledWith(
        'invalid-token',
        expect.any(Object)
      )
    })

    it('should create a new user and return 201 when the request body and CSRF token are valid', async () => {
      // Arrange
      mockedCsrf.validateCsrfToken.mockReturnValue(true)
      const validRequestBody = createValidUserProfile()
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'valid-token',
        },
      })

      // Act
      const response = await POST(request)
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
      mockedCsrf.validateCsrfToken.mockReturnValue(true)
      const invalidRequestBody = {
        // 'username' and 'email' are missing
        firstName: 'Jane',
        lastName: 'Doe',
      }
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'valid-token',
        },
      })

      // Act
      const response = await POST(request)
      const errorData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(errorData).toHaveProperty('errors')
      expect(Array.isArray(errorData.errors)).toBe(true)
      expect(errorData.errors.length).toBeGreaterThan(0)
    })

    it('should return 400 for data that does not meet schema constraints', async () => {
      // Arrange
      mockedCsrf.validateCsrfToken.mockReturnValue(true)
      const invalidRequestBody = createValidUserProfile({
        username: 'jo', // Too short
        email: 'not-an-email',
      })
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'valid-token',
        },
      })

      // Act
      const response = await POST(request)
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
