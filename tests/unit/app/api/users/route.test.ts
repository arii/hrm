// tests/unit/app/api/users/route.test.ts
/** @jest-environment node */

import { POST } from '@/app/api/users/route'
import { NextRequest } from 'next/server'

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}))

describe('API Route: /api/users', () => {
  describe('POST', () => {
    it('should return 400 Bad Request if validation fails', async () => {
      const invalidRequestBody = {
        // Missing 'username' and 'email'
        firstName: 'Test',
        lastName: 'User',
      }
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toBeDefined()
      const errorPaths = data.errors.map((e) => e.path)
      expect(errorPaths).toContain('username')
      expect(errorPaths).toContain('email')
    })

    it('should create a new user and return 201 Created on valid input', async () => {
      const validRequestBody = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      }
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(validRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('mock-uuid')
      expect(data.username).toBe('testuser')
      expect(data.email).toBe('test@example.com')
      expect(data.firstName).toBe('Test')
      expect(data.lastName).toBe('User')
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
    })

    it('should handle optional fields (nullable) correctly', async () => {
      const requestBodyWithNulls = {
        username: 'anotheruser',
        email: 'another@example.com',
        firstName: null,
        lastName: null,
      }
      const req = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(requestBodyWithNulls),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('mock-uuid')
      expect(data.username).toBe('anotheruser')
      expect(data.email).toBe('another@example.com')
      expect(data.firstName).toBeNull()
      expect(data.lastName).toBeNull()
    })
  })
})
