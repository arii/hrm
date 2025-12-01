// tests/unit/lib/api.test.ts
import { validateSession } from '@/lib/api/session'
import { getSpotifyClient } from '@/lib/api/spotify'
import {
  successResponse,
  errorResponse,
  jsonResponse,
} from '@/lib/api/response'
import { getServerSession } from 'next-auth/next'
import { UnauthorizedError, HttpError } from '@/lib/errors'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { Session } from 'next-auth'

// Mock next-auth
jest.mock('next-auth/next')
const mockedGetServerSession = getServerSession as jest.Mock

describe('API Utility Functions', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  // Tests for validateSession
  describe('validateSession', () => {
    it('should return a session object when a valid session exists', async () => {
      const mockSession = { accessToken: 'test-token' }
      mockedGetServerSession.mockResolvedValue(mockSession)
      await expect(validateSession()).resolves.toEqual(mockSession)
    })

    it('should throw an UnauthorizedError when no session exists', async () => {
      mockedGetServerSession.mockResolvedValue(null)
      await expect(validateSession()).rejects.toThrow(UnauthorizedError)
    })
  })

  // Tests for getSpotifyClient
  describe('getSpotifyClient', () => {
    it('should return a SpotifyApi instance when a valid session with an access token is provided', () => {
      const mockSession = { accessToken: 'test-token' }
      const client = getSpotifyClient(mockSession as unknown as Session)
      expect(client).toBeInstanceOf(SpotifyApi)
    })

    it('should throw an UnauthorizedError when the session is missing an access token', () => {
      const mockSession = {}
      expect(() => getSpotifyClient(mockSession as unknown as Session)).toThrow(
        UnauthorizedError
      )
    })
  })

  // Tests for response helpers
  describe('response helpers', () => {
    it('jsonResponse should create a NextResponse with the correct status and body', () => {
      const response = jsonResponse(201, { message: 'created' })
      expect(response.status).toBe(201)
    })

    it('successResponse should create a 200 OK response', () => {
      const response = successResponse({ data: 'test' })
      expect(response.status).toBe(200)
    })

    it('errorResponse should handle HttpError correctly', () => {
      const error = new HttpError(404, 'Not Found')
      const response = errorResponse(error)
      expect(response.status).toBe(404)
    })

    it('errorResponse should handle unknown errors with a default status', () => {
      const error = new Error('Something went wrong')
      const response = errorResponse(error)
      expect(response.status).toBe(500)
    })
  })
})
