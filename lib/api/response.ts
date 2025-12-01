// File: lib/api/response.ts
import { NextResponse } from 'next/server'
import { HttpError } from '@/lib/errors'

/**
 * Creates a JSON response with a given status and body.
 * @param {number} status - The HTTP status code.
 * @param {any} body - The response body.
 * @returns {NextResponse} The JSON response.
 */
export function jsonResponse(status: number, body: any): NextResponse {
  return NextResponse.json(body, { status })
}

/**
 * Creates a standard success response.
 * @param {any} data - The payload to return.
 * @returns {NextResponse} A 200 OK response.
 */
export function successResponse(data: any): NextResponse {
  return jsonResponse(200, data)
}

/**
 * Creates a consistent error response.
 * Logs unexpected errors to the console.
 * @param {any} error - The error object.
 * @param {number} [defaultStatus=500] - The default status code for unknown errors.
 * @returns {NextResponse} The error response.
 */
export function errorResponse(
  error: any,
  defaultStatus: number = 500
): NextResponse {
  if (error instanceof HttpError) {
    return jsonResponse(error.status, {
      error: { message: error.message, status: error.status },
    })
  }

  console.error('Unhandled API Error:', error)
  return jsonResponse(defaultStatus, {
    error: {
      message: 'An internal server error occurred',
      status: defaultStatus,
    },
  })
}
