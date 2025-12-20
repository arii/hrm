/**
 * @jest-environment node
 */
import { withValidation } from '../../../../lib/middleware/validation'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// Mock the NextResponse
const mockJson = jest.fn()
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: (...args: any[]) => {
      mockJson(...args)
      // Return a mock response object that can be checked in tests
      return {
        json: () => Promise.resolve(args[0]),
        status: args[1]?.status || 200,
        headers: new Headers(args[1]?.headers),
      }
    },
  },
}))

describe('withValidation Middleware', () => {
  // A mock handler to be wrapped by the middleware
  const mockHandler = jest.fn(async (req, { body, query, params, headers }) => {
    return NextResponse.json({
      message: 'Success',
      data: { body, query, params, headers },
    })
  })

  // Sample Zod schemas for validation
  const bodySchema = z.object({
    name: z.string(),
    age: z.number().min(18),
  })
  const querySchema = z.object({
    search: z.string().min(3),
  })
  const paramsSchema = z.object({
    id: z.string().uuid(),
  })
  const headersSchema = z
    .object({
      'x-api-key': z.string().length(16),
    })
    .passthrough() // Allow other headers

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    mockHandler.mockClear()
  })

  describe('Successful Validation Scenarios', () => {
    it('should call the handler with validated data when the request is valid', async () => {
      const validBody = { name: 'John Doe', age: 30 }
      const uuid = 'a1b2c3d4-a1b2-c3d4-a1b2-c3d4a1b2c3d4'
      const req = new NextRequest(`http://localhost/api/test/${uuid}?search=valid`, {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: {
          'x-api-key': '1234567890123456',
          'content-type': 'application/json',
        },
      })

      const validatedHandler = withValidation({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
        headers: headersSchema,
      })(mockHandler)

      await validatedHandler(req, { params: { id: uuid } })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      const [calledReq, calledContext] = mockHandler.mock.calls[0]
      expect(calledReq).toBe(req)
      expect(calledContext.body).toEqual(validBody)
      expect(calledContext.query).toEqual({ search: 'valid' })
      expect(calledContext.params).toEqual({ id: uuid })
      expect(calledContext.headers).toEqual(
        expect.objectContaining({ 'x-api-key': '1234567890123456' })
      )
    })
  })

  describe('Body Validation Scenarios', () => {
    it('should return a 400 error for a request with an empty body', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '', // Empty body
      })

      const validatedHandler = withValidation({ body: bodySchema })(mockHandler)
      const response = await validatedHandler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
        }),
        { status: 400 }
      )
      expect(response.status).toBe(400)
    })

    it('should return a 400 error for a request with unexpected data types', async () => {
      const invalidBody = { name: 'John Doe', age: 'twenty' } // 'age' is a string, not a number
      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify(invalidBody),
        headers: { 'content-type': 'application/json' },
      })

      const validatedHandler = withValidation({ body: bodySchema })(mockHandler)
      const response = await validatedHandler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()

      const responseBody = await response.json()
      expect(responseBody.message).toBe('Validation failed')
      expect(responseBody.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['body', 'age'],
            message: 'Invalid input: expected number, received string',
          }),
        ])
      )
      expect(response.status).toBe(400)
    })
  })

  describe('Query, Params, and Header Validation', () => {
    it('should return a 400 error if query parameters are invalid', async () => {
      // 'search' query param is missing
      const req = new NextRequest('http://localhost/api/test')
      const handler = withValidation({ query: querySchema })(mockHandler)
      const response = await handler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Validation failed' }),
        { status: 400 }
      )
      expect(response.status).toBe(400)
    })

    it('should return a 400 error if URL parameters are invalid', async () => {
      const req = new NextRequest('http://localhost/api/test/123')
      const handler = withValidation({ params: paramsSchema })(mockHandler)
      const response = await handler(req, { params: { id: 'not-a-uuid' } }) // 'id' is not a UUID

      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Validation failed' }),
        { status: 400 }
      )
      expect(response.status).toBe(400)
    })

    it('should return a 400 error if headers are invalid', async () => {
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-api-key': 'short' }, // API key is too short
      })
      const handler = withValidation({ headers: headersSchema })(mockHandler)
      const response = await handler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Validation failed' }),
        { status: 400 }
      )
      expect(response.status).toBe(400)
    })
  })
})
