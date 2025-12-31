/**
 * @jest-environment node
 */
import { POST } from '@/app/api/users/[userId]/physical-profile/route'
import { NextRequest } from 'next/server'
import { createValidUserPhysicalProfile } from '@/tests/unit/test-data/user-data-factory'
import { randomUUID } from 'crypto'

describe('API Route: /api/users/[userId]/physical-profile', () => {
  describe('POST', () => {
    it('should create a new user physical profile and return 201 when the request body is valid', async () => {
      // Arrange
      const userId = randomUUID()
      const validRequestBody = createValidUserPhysicalProfile({ userId })
      const request = new NextRequest(
        `http://localhost/api/users/${userId}/physical-profile`,
        {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
          headers: { 'Content-Type': 'application/json' },
        }
      )

      // Act
      const response = await POST(request, { params: { userId } })
      const newUserPhysicalProfile = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(newUserPhysicalProfile.userId).toBe(userId)
      expect(newUserPhysicalProfile.age).toBe(validRequestBody.age)
      expect(newUserPhysicalProfile.weight).toBe(validRequestBody.weight)
      expect(newUserPhysicalProfile.gender).toBe(validRequestBody.gender)
    })
  })
})
