import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withValidation } from '@/lib/middleware/validation'

// Mock handler to be wrapped by the middleware
const mockHandler = jest.fn(
  async (
    _req: NextRequest,
    { body, params, headers }
  ): Promise<NextResponse> => {
    return NextResponse.json({
      success: true,
      data: { body, params, headers },
    })
  }
)

// Define schemas for testing
const testSchemas = {
  body: z.object({
    name: z.string(),
    age: z.number(),
  }),
  params: z.object({
    userId: z.string().uuid(),
  }),
  headers: z.object({
    'x-api-key': z.string().min(10),
    'content-type': z.literal('application/json'),
  }),
}

describe('withValidation Middleware', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    mockHandler.mockClear()
  })

  // Case 1: Valid body, params, and headers
  it('should call the handler with parsed data when all inputs are valid', async () => {
    const validBody = { name: 'John Doe', age: 30 }
    const validParams = { userId: '123e4567-e89b-12d3-a456-426614174000' }
    const validHeaders = new Headers({
      'x-api-key': 'a-valid-api-key-string',
      'content-type': 'application/json',
    })

    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify(validBody),
    })

    const wrappedHandler = withValidation(testSchemas)(mockHandler)
    const response = await wrappedHandler(req, { params: validParams })

    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(mockHandler).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        body: validBody,
        params: validParams,
        headers: expect.objectContaining({
          'x-api-key': 'a-valid-api-key-string',
        }),
      })
    )
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.success).toBe(true)
  })

  // Case 2: Missing required header
  it('should return a 400 error if a required header is missing', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' }, // Missing x-api-key
      body: JSON.stringify({ name: 'Test', age: 25 }),
    })

    const wrappedHandler = withValidation({
      headers: testSchemas.headers,
    })(mockHandler)
    const response = await wrappedHandler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          location: 'headers',
          path: 'x-api-key',
        }),
      ])
    )
  })

  // Case 3: Malformed UUID in params
  it('should return a 400 error for a malformed UUID in params', async () => {
    const invalidParams = { userId: 'not-a-uuid' }
    const req = new NextRequest('http://localhost/api/test')

    const wrappedHandler = withValidation({ params: testSchemas.params })(
      mockHandler
    )
    const response = await wrappedHandler(req, { params: invalidParams })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.details).toEqual(
      expect.arrayContaining([
        {
          location: 'params',
          path: 'userId',
          message: 'Invalid UUID',
        },
      ])
    )
  })

  // Case 4: Empty JSON body when body is required
  it('should return a 400 error for an empty request body', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: '', // Empty body
      headers: { 'content-type': 'application/json' },
    })

    const wrappedHandler = withValidation({ body: testSchemas.body })(
      mockHandler
    )
    const response = await wrappedHandler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.details[0].message).toBe('Request body is not valid JSON.')
  })

  // Case 5: Extra fields (strip check)
  it('should strip extra fields from the body by default', async () => {
    const bodyWithExtra = {
      name: 'Jane Doe',
      age: 40,
      extraField: 'should-be-stripped',
    }
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify(bodyWithExtra),
    })

    // Zod objects strip extra fields by default
    const wrappedHandler = withValidation({ body: testSchemas.body })(
      mockHandler
    )
    await wrappedHandler(req, { params: {} })

    expect(mockHandler).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        body: { name: 'Jane Doe', age: 40 }, // extraField is gone
      })
    )
  })

  it('should handle validation for multiple locations correctly', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }), // Missing 'age' in body
    })

    const wrappedHandler = withValidation({
      body: testSchemas.body,
      params: testSchemas.params,
    })(mockHandler)
    // Missing userId in params
    const response = await wrappedHandler(req, { params: {} })

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.details).toHaveLength(2)
    expect(json.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ location: 'params', path: 'userId' }),
        expect.objectContaining({ location: 'body', path: 'age' }),
      ])
    )
  })
})
