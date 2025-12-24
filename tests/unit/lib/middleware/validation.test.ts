/**
 * @file Unit tests for the withValidation middleware.
 * @see {@link lib/middleware/validation}
 */

import { withValidation } from '@/lib/middleware/validation'
import { CreateUserProfileSchema } from '@/lib/validation/schemas'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Mock the NextResponse object
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      const defaultInit = { status: 200 }
      const finalInit = { ...defaultInit, ...init }
      return {
        ...finalInit,
        body: JSON.stringify(body),
        json: () => Promise.resolve(body),
      }
    }),
  },
}))

describe('withValidation Middleware', () => {
  // Handler that will be wrapped by the middleware
  const mockHandler = jest.fn(async (req, { body }) => {
    return NextResponse.json({ success: true, data: body })
  })

  // Mock Request object
  const createMockRequest = (body: any, headers = {}) => {
    return {
      json: () => Promise.resolve(body),
      headers: new Headers(headers),
    } as unknown as Request
  }

  beforeEach(() => {
    // Clear mock history before each test
    jest.clearAllMocks()
    mockHandler.mockClear()
  })

  it('should call the handler with validated data when the payload is valid', async () => {
    // Arrange
    const validPayload = {
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    }
    const req = createMockRequest(validPayload)
    const validatedHandler = withValidation({ schema: CreateUserProfileSchema })(
      mockHandler
    )

    // Act
    const response = await validatedHandler(req, { params: {} })
    const responseBody = await response.json()

    // Assert
    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(mockHandler).toHaveBeenCalledWith(req, {
      params: {},
      body: validPayload,
    })
    expect(response.status).toBe(200)
    expect(responseBody).toEqual({ success: true, data: validPayload })
  })

  it('should return a 400 error if the payload is invalid', async () => {
    // Arrange
    const invalidPayload = {
      // Missing 'username' and 'email'
      firstName: 'Test',
      lastName: 'User',
    }
    const req = createMockRequest(invalidPayload)
    const validatedHandler = withValidation({ schema: CreateUserProfileSchema })(
      mockHandler
    )

    // Act
    const response = await validatedHandler(req, { params: {} })
    const responseBody = await response.json()

    // Assert
    expect(mockHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    expect(responseBody.errors).toBeDefined()
    expect(responseBody.errors).toHaveLength(2)
    expect(responseBody.errors[0].path).toBe('username')
    expect(responseBody.errors[1].path).toBe('email')
  })

  it('should return a 400 error if the payload is not valid JSON', async () => {
    // Arrange
    const req = {
      json: () => Promise.reject(new SyntaxError('Unexpected token i in JSON at position 1')),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    } as unknown as Request
    const validatedHandler = withValidation({ schema: CreateUserProfileSchema })(
      mockHandler
    )
    // Act
    const response = await validatedHandler(req, { params: {} })
    const responseBody = await response.json()

    // Assert
    expect(mockHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    expect(responseBody.message).toBe('Invalid JSON in request body.')
  })
})
