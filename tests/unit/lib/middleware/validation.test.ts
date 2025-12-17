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

const TestParamsSchema = z.object({
  userId: z.string().uuid('Invalid user ID format.'),
})

const TestHeadersSchema = z.object({
  'x-request-id': z.string().uuid('Invalid X-Request-ID format.'),
})

// A mock handler to be wrapped by the middleware
const mockHandler = jest.fn(
  async (
    _req: Request,
    {
      body,
      query,
      params,
      headers,
    }: {
      body?: z.infer<typeof TestBodySchema>
      query?: z.infer<typeof TestQuerySchema>
      params?: z.infer<typeof TestParamsSchema>
      headers?: z.infer<typeof TestHeadersSchema>
    }
  ) => {
    // Simulate a successful response with the validated data
    return NextResponse.json({
      success: true,
      received: { body, query, params, headers },
    })
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
        headers: undefined,
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
          message: 'Validation failed.',
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

    it('should return 400 on empty body request', async () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: '',
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
        headers: undefined,
      })
    })
  })

  // =================================================================
  // Params Validation Tests
  // =================================================================
  describe('Params Validation', () => {
    it('should call the handler with validated params on valid request', async () => {
      const validParams = { userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' }
      const request = new Request('http://localhost/api/test')

      const wrappedHandler = withValidation({ paramsSchema: TestParamsSchema })(
        mockHandler
      )
      await wrappedHandler(request, { params: validParams })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(request, {
        params: validParams,
        body: undefined,
        query: undefined,
        headers: undefined,
      })
    })
  })

  // =================================================================
  // Headers Validation Tests
  // =================================================================
  describe('Headers Validation', () => {
    it('should call the handler with validated headers on valid request', async () => {
      const validHeaders = {
        'x-request-id': 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      }
      const request = new Request('http://localhost/api/test', {
        headers: validHeaders,
      })

      const wrappedHandler = withValidation({
        headersSchema: TestHeadersSchema,
      })(mockHandler)
      await wrappedHandler(request, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      expect(mockHandler).toHaveBeenCalledWith(request, {
        params: {},
        body: undefined,
        query: undefined,
        headers: validHeaders,
      })
    })
  })
})
