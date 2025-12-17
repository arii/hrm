/**
 * @file Unit tests for the withValidation middleware.
 * @see /lib/middleware/validation.ts
 *
 * These tests cover the functionality of the withValidation higher-order function,
 * ensuring it correctly validates request bodies and query parameters against Zod schemas,
 * handles errors gracefully, and passes validated data to the wrapped handler.
 *
 * @jest-environment-node
 */
import { withValidation } from '@/lib/middleware/validation'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Mock the NextResponse object
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      ...init,
      body: JSON.stringify(body), // Simple mock, adjust as needed
    })),
  },
}))

// Define test schemas
const TestBodySchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  age: z.number().positive('Age must be a positive number.'),
})

const TestQuerySchema = z.object({
  id: z.string().uuid('Invalid ID format.'),
  source: z.enum(['web', 'mobile']),
})

// A mock handler to be wrapped by the middleware
const mockHandler = jest.fn(
  async (
    _req: Request,
    {
      body,
      query,
    }: {
      body?: z.infer<typeof TestBodySchema>
      query?: z.infer<typeof TestQuerySchema>
    }
  ) => {
    // Simulate a successful response with the validated data
    return NextResponse.json({ success: true, received: { body, query } })
  }
)

describe('withValidation Middleware', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks()
  })

  // =================================================================
  // Body Validation Tests
  // =================================================================
  describe('Body Validation', () => {
    it('should call the handler with validated body on valid request', async () => {
      const validBody = { name: 'John Doe', age: 30 }
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify(validBody),
      })

      const wrappedHandler = withValidation({ bodySchema: TestBodySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(request, {
        params: {},
        body: validBody,
        query: undefined,
      })
    })

    it('should return 400 on invalid body data', async () => {
      const invalidBody = { name: '', age: -5 } // name is empty, age is negative
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
      })

      const wrappedHandler = withValidation({ bodySchema: TestBodySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: 'name',
              message: 'Name is required.',
            }),
            expect.objectContaining({
              path: 'age',
              message: 'Age must be a positive number.',
            }),
          ]),
        }),
        { status: 400 }
      )
    })

    it('should return 400 on invalid JSON syntax', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: '{"name": "John Doe", "age": 30,}', // Invalid JSON with trailing comma
      })

      const wrappedHandler = withValidation({ bodySchema: TestBodySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'Invalid JSON in request body.' },
        { status: 400 }
      )
    })
  })

  // =================================================================
  // Query Validation Tests
  // =================================================================
  describe('Query Validation', () => {
    it('should call the handler with validated query on valid request', async () => {
      const validQuery = {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        source: 'web',
      }
      const request = new Request(
        `http://localhost/api/test?id=${validQuery.id}&source=${validQuery.source}`
      )

      const wrappedHandler = withValidation({ querySchema: TestQuerySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(request, {
        params: {},
        body: undefined,
        query: validQuery,
      })
    })

    it('should return 400 on invalid query data', async () => {
      const request = new Request(
        'http://localhost/api/test?id=invalid-uuid&source=desktop'
      )

      const wrappedHandler = withValidation({ querySchema: TestQuerySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: 'id',
              message: 'Invalid uuid',
            }),
            expect.objectContaining({
              path: 'source',
              message:
                "Invalid enum value. Expected 'web' | 'mobile', received 'desktop'",
            }),
          ]),
        }),
        { status: 400 }
      )
    })

    it('should return 400 on missing required query parameters', async () => {
      const request = new Request('http://localhost/api/test?source=web')

      const wrappedHandler = withValidation({ querySchema: TestQuerySchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: 'id',
              message: 'Required',
            }),
          ]),
        }),
        { status: 400 }
      )
    })
  })

  // =================================================================
  // Combined Validation Tests
  // =================================================================
  describe('Combined Body and Query Validation', () => {
    it('should call handler with validated data when both body and query are valid', async () => {
      const validBody = { name: 'Jane Doe', age: 25 }
      const validQuery = {
        id: 'f0e9d8c7-b6a5-4321-fedc-ba9876543210',
        source: 'mobile',
      }
      const request = new Request(
        `http://localhost/api/test?id=${validQuery.id}&source=${validQuery.source}`,
        {
          method: 'PUT',
          body: JSON.stringify(validBody),
        }
      )

      const wrappedHandler = withValidation({
        bodySchema: TestBodySchema,
        querySchema: TestQuerySchema,
      })(mockHandler)
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(request, {
        params: {},
        body: validBody,
        query: validQuery,
      })
    })

    it('should return 400 if body is invalid, even if query is valid', async () => {
      const invalidBody = { name: '', age: 25 }
      const validQuery = {
        id: 'f0e9d8c7-b6a5-4321-fedc-ba9876543210',
        source: 'mobile',
      }
      const request = new Request(
        `http://localhost/api/test?id=${validQuery.id}&source=${validQuery.source}`,
        {
          method: 'PUT',
          body: JSON.stringify(invalidBody),
        }
      )

      const wrappedHandler = withValidation({
        bodySchema: TestBodySchema,
        querySchema: TestQuerySchema,
      })(mockHandler)
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ path: 'name' }),
          ]),
        }),
        { status: 400 }
      )
    })
  })

  // =================================================================
  // General Behavior Tests
  // =================================================================
  describe('General Behavior', () => {
    it('should return 500 if the handler throws an unhandled error', async () => {
      const errorMessage = 'Something went wrong in the handler!'
      const handlerThatThrows = jest
        .fn()
        .mockRejectedValue(new Error(errorMessage))

      const request = new Request(
        'http://localhost/api/test?id=a1b2c3d4-e5f6-7890-1234-567890abcdef&source=web'
      )

      const wrappedHandler = withValidation({ querySchema: TestQuerySchema })(
        handlerThatThrows
      )

      // Mock console.error to suppress logs during this test
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      await wrappedHandler(request, { params: {} })

      expect(handlerThatThrows).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'An internal server error occurred.' },
        { status: 500 }
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
