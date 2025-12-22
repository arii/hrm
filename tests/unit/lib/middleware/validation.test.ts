/**
 * @jest-environment node
 */
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createTestRequest } from '../next-request-helper'

// Mock the NextResponse
const mockJson = jest.fn()
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: (...args: unknown[]) => {
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

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    mockHandler.mockClear()
  })

  describe('Successful Validation Scenarios', () => {
    it('should call the handler with validated data when the request is valid', async () => {
      const validBody = { name: 'John Doe', age: 30 }
      const req = createTestRequest({
        body: validBody,
      })

      const validatedHandler = withValidation({ body: bodySchema })(
        mockHandler
      )

      await validatedHandler(req, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      const [calledReq, calledContext] = mockHandler.mock.calls[0]
      expect(calledReq).toBe(req)
      expect(calledContext.body).toEqual(validBody)
    })
  })

  describe('Body Validation Scenarios', () => {
    it('should return a 400 error for a request with an empty body', async () => {
      const req = createTestRequest({
        body: '',
      })

      const validatedHandler = withValidation({ body: bodySchema })(
        mockHandler
      )
      const response = await validatedHandler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()
      expect(mockJson).toHaveBeenCalledWith(
        { message: 'Invalid JSON in request body.' },
        { status: 400 }
      )
      expect(response.status).toBe(400)
    })

    it('should return a 400 error for a request with unexpected data types', async () => {
      const invalidBody = { name: 'John Doe', age: 'twenty' } // 'age' is a string, not a number
      const req = createTestRequest({
        body: invalidBody,
      })

      const validatedHandler = withValidation({ body: bodySchema })(
        mockHandler
      )
      const response = await validatedHandler(req, { params: {} })

      expect(mockHandler).not.toHaveBeenCalled()

      const responseBody = await response.json()
      expect(responseBody.message).toBe('Validation failed')
      expect(responseBody.errors).toEqual([
        {
          path: ['body', 'age'],
          message: 'Expected number, received string',
        },
      ])
      expect(response.status).toBe(400)
    })
  })
})
