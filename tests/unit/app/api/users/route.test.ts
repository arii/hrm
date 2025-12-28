/**
 * @jest-environment node
 */
import { POST } from '@/app/api/users/route'
import {
  createMockRequestWithCsrf,
  MockRequestLike,
} from '@/tests/unit/test-helpers'
import { PrismaClient, User } from '@prisma/client'
import { DeepMockProxy, mockDeep } from 'jest-mock-extended'
import { nanoid } from 'nanoid'

// Mock Prisma client
const mockPrisma: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>()
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}))

// Mock nanoid for predictable IDs
jest.mock('nanoid')
const mockedNanoid = jest.mocked(nanoid)

describe('API Route: /api/users', () => {
  const MOCK_USER_ID = 'mock-uuid-v4'
  const MOCK_TIMESTAMP = new Date()

  beforeEach(() => {
    jest.clearAllMocks()
    mockedNanoid.mockReturnValue(MOCK_USER_ID)
  })

  describe('POST', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      age: 30,
      weight: 70,
    }

    it('should return 403 when CSRF token is invalid', async () => {
      // Arrange
      const request = {
        headers: { get: () => null },
        cookies: { get: () => undefined },
        json: async () => validUserData,
      }

      // Act
      const response = await POST(request as any)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.message).toBe('Forbidden: CSRF token missing from headers')
    })

    it('should create a new user and return 201 when the request body and CSRF token are valid', async () => {
      // Arrange
      const mockUser: User = {
        id: MOCK_USER_ID,
        ...validUserData,
        createdAt: MOCK_TIMESTAMP,
        updatedAt: MOCK_TIMESTAMP,
      }
      mockPrisma.user.create.mockResolvedValue(mockUser)
      const request: MockRequestLike = createMockRequestWithCsrf(validUserData)

      // Act
      const response = await POST(request as any)
      const newUser = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(newUser.id).toBe('mock-uuid-v4')
      expect(newUser).toHaveProperty('createdAt')
      expect(newUser).toHaveProperty('updatedAt')
      expect(newUser.username).toBe(validUserData.username)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: MOCK_USER_ID,
          ...validUserData,
        },
      })
    })

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const incompleteUserData = {
        username: 'testuser',
        // email is missing
      }
      const request = createMockRequestWithCsrf(incompleteUserData)

      // Act
      const response = await POST(request as any)
      const errorData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(errorData).toHaveProperty('errors')
      expect(Array.isArray(errorData.errors)).toBe(true)
      expect(errorData.errors.length).toBeGreaterThan(0)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should return 400 for data that does not meet schema constraints', async () => {
      // Arrange
      const invalidUserData = {
        username: 'u', // Too short
        email: 'not-an-email', // Invalid format
        age: 5, // Too young
        weight: 9, // Too light
      }
      const request = createMockRequestWithCsrf(invalidUserData)

      // Act
      const response = await POST(request as any)
      const errorData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(errorData).toHaveProperty('errors')
      expect(Array.isArray(errorData.errors)).toBe(true)
      // Expecting errors for all invalid fields
      expect(errorData.errors.length).toBe(4)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })
  })
})
