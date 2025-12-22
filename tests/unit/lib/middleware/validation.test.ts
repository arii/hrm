/**
 * @jest-environment node
 */
import { withValidation } from '@/lib/middleware/validation'
import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createTestRequest } from '../next-request-helper'
import { fromZodError } from 'zod-validation-error'

// Mock NextResponse.json to spy on its calls and return a mock response
jest.mock('next/server', () => ({
  ...jest.requireActual('next/server'),
  NextResponse: {
    json: jest.fn((body, init) => ({
      body: JSON.stringify(body),
      status: init?.status || 200,
      json: () => Promise.resolve(body),
    })),
  },
}))
const mockedNextResponseJson = NextResponse.json as jest.Mock

// A simple mock handler that returns the validated data.
const mockHandler = jest.fn(async (_req, { validatedData }) => {
  return mockedNextResponseJson({ success: true, validatedData })
})

const bodySchema = z.object({ name: z.string(), age: z.number().min(18) })
const querySchema = z.object({ id: z.string().uuid() })
const paramsSchema = z.object({ userId: z.string().uuid() })

describe('withValidation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call handler with validated data on success', async () => {
    const validBody = { name: 'John Doe', age: 30 }
    const req = createTestRequest({ body: validBody })
    const handler = withValidation({ bodySchema })(mockHandler)
    await handler(req, { params: {} })

    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(mockHandler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        validatedData: expect.objectContaining({ body: validBody }),
      })
    )
  })

  it('should handle combined validation (body, query, params)', async () => {
    const validBody = { name: 'John Doe', age: 30 }
    const validQuery = { id: '123e4567-e89b-12d3-a456-426614174000' }
    const validParams = { userId: '7a8b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d' }
    const req = createTestRequest({
      body: validBody,
      url: `http://localhost?id=${validQuery.id}`,
    })
    const handler = withValidation({ bodySchema, querySchema, paramsSchema })(
      mockHandler
    )
    await handler(req, { params: validParams })
    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(mockHandler).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        validatedData: {
          body: validBody,
          query: validQuery,
          params: validParams,
          headers: undefined, // headersSchema was not provided
        },
      })
    )
  })

  it('should return 400 for empty body when required', async () => {
    const req = createTestRequest({ body: '' })
    const handler = withValidation({ bodySchema })(mockHandler)
    await handler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { message: 'Request body cannot be empty.' },
      { status: 400 }
    )
  })

  it('should return 400 for invalid JSON syntax', async () => {
    // Manually create a request with an invalid JSON body.
    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: '{"bad json"',
    })
    const handler = withValidation({ bodySchema })(mockHandler)
    await handler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { message: 'Invalid JSON in request body.' },
      { status: 400 }
    )
  })

  it('should return 400 for incorrect data type', async () => {
    const invalidBody = { name: 'test', age: 'invalid' }
    const req = createTestRequest({ body: invalidBody })
    const handler = withValidation({ bodySchema })(mockHandler)
    await handler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    const expectedError = fromZodError(
      bodySchema.safeParse(invalidBody).error as z.ZodError
    )
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      { message: 'Validation failed', errors: expectedError.details },
      { status: 400 }
    )
  })

  it('should return 400 for invalid query params', async () => {
    const req = createTestRequest({ url: 'http://localhost?id=not-a-uuid' })
    const handler = withValidation({ querySchema })(mockHandler)
    await handler(req, { params: {} })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
      { status: 400 }
    )
  })

  it('should return 400 for invalid route params', async () => {
    const req = createTestRequest({})
    const handler = withValidation({ paramsSchema })(mockHandler)
    await handler(req, { params: { userId: 'not-a-uuid' } })

    expect(mockHandler).not.toHaveBeenCalled()
    expect(mockedNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
      { status: 400 }
    )
  })
})
