/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { withValidation } from '../../../../lib/middleware/validation'
import logger from '../../../../utils/logger'

// Mock the logger to prevent test output from being cluttered with expected errors
jest.mock('../../../../utils/logger', () => ({
  error: jest.fn(),
}))

// Define a simple test schema
const testSchema = z.object({
  name: z.string().min(1),
  age: z.number().positive(),
})

describe('withValidation Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction = jest.fn()

  // Reset mocks before each test
  beforeEach(() => {
    mockRequest = {
      body: {},
    }
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    nextFunction = jest.fn()
  })

  it('should call next() and attach parsed data to req.body for a valid request', () => {
    const validBody = { name: 'John Doe', age: 30 }
    mockRequest.body = validBody

    const middleware = withValidation(testSchema)
    middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction
    )

    expect(nextFunction).toHaveBeenCalledTimes(1)
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
    // Zod parsing returns a new object, so we check for deep equality
    expect(mockRequest.body).toEqual(validBody)
  })

  it('should return a 400 error for an invalid request body', () => {
    const invalidBody = { name: 'John Doe', age: -5 } // Invalid age
    mockRequest.body = invalidBody

    const middleware = withValidation(testSchema)
    middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction
    )

    expect(nextFunction).not.toHaveBeenCalled()
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Invalid request body',
      errors: {
        age: ['Too small: expected number to be >0'],
      },
    })
    // Ensure the logger was called with the validation error
    expect(logger.error).toHaveBeenCalled()
  })

  it('should strip extra properties and pass validation', () => {
    const bodyWithExtra = {
      name: 'Jane Doe',
      age: 25,
      extra: 'this should be stripped',
    }
    mockRequest.body = bodyWithExtra

    const middleware = withValidation(testSchema)
    middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction
    )

    expect(nextFunction).toHaveBeenCalledTimes(1)
    expect(mockResponse.status).not.toHaveBeenCalled()
    // The body should now only contain the properties defined in the schema
    expect(mockRequest.body).toEqual({ name: 'Jane Doe', age: 25 })
  })

  it('should return a 400 error if required fields are missing', () => {
    const incompleteBody = { name: 'Just a name' } // Missing 'age'
    mockRequest.body = incompleteBody

    const middleware = withValidation(testSchema)
    middleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction as NextFunction
    )

    expect(nextFunction).not.toHaveBeenCalled()
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: 'Invalid request body',
      errors: {
        age: ['Invalid input: expected number, received undefined'],
      },
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
