/**
 * @jest-environment node
 */
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

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
  const mockHandler = jest.fn(async (req, { body }) => {
    return NextResponse.json({
      message: 'Success',
      data: { body },
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
      const req = new NextRequest(`http://localhost/api/test`, {
        method: 'POST',
        body: JSON.stringify(validBody),
        headers: {
          'content-type': 'application/json',
        },
      })

      const validatedHandler = withValidation({
        body: bodySchema,
      })(mockHandler)

      await validatedHandler(req, { params: {} })

      expect(mockHandler).toHaveBeenCalledTimes(1)
      const [calledReq, calledContext] = mockHandler.mock.calls[0]
      expect(calledReq).toBe(req)
      expect(calledContext.body).toEqual(validBody)
    })
  })
})
