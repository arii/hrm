import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock the `Request` object for API route tests
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input: RequestInfo, init?: RequestInit) {
      // Simple mock implementation
    }
  } as any
}

// Mock the `fail` function for the knip test
;(global as any).fail = jest.fn()
